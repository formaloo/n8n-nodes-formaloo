import {
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IHookFunctions,
	IWebhookResponseData,
	NodeOperationError,
	INodeParameterResourceLocator,
} from 'n8n-workflow';

import { searchFormsForResourceLocator, getForms } from './FormalooFunctions';

export class FormalooTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Formaloo Trigger',
		name: 'formalooTrigger',
		icon: 'file:formaloo-picture.svg',
		group: ['trigger'],
		defaultVersion: 1,
		version: [1],
		description: 'Trigger workflow on Formaloo form submissions and updates',
		defaults: {
			name: 'Formaloo Trigger',
		},
		inputs: [],
		outputs: ['main'] as any,
		credentials: [
			{
				name: 'formalooApi',
				required: true,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Form Name or ID',
				name: 'formSlug',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				description: 'Search and select a form. You can search by form name or slug.',
				required: true,
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: 'Select a form...',
						typeOptions: {
							searchListMethod: 'searchFormsForResourceLocator',
							searchFilterRequired: false,
							searchable: true,
						},
					},
					{
						displayName: 'By ID',
						name: 'id',
						type: 'string',
						placeholder: 'Enter Form Slug...',
					},
					{
						displayName: 'By URL',
						name: 'url',
						type: 'string',
						placeholder: 'Enter Form URL...',
					},
				],
			},
			{
				displayName: 'Event Type',
				name: 'event',
				type: 'options',
				options: [
					{
						name: 'Form Submit',
						value: 'form_submit',
						description: 'Trigger when a new form submission is received',
					},
					{
						name: 'Row Update',
						value: 'row_update',
						description: 'Trigger when a form entry is updated',
					},
					{
						name: 'Payment Completed',
						value: 'payment_completed',
						description: 'Trigger when a payment is completed',
					},
					{
						name: 'All',
						value: 'all',
						description: 'Trigger when any changes are made to the form',
					},
				],
				default: 'form_submit',
				required: true,
			},
		],
	};

	methods = {
		loadOptions: {
			getForms,
		},
		listSearch: {
			searchFormsForResourceLocator,
		},
	};

	webhookMethods = {
		default: {
			checkExists: async function (this: IHookFunctions): Promise<boolean> {
				const formSlugParam = this.getNodeParameter('formSlug') as string | INodeParameterResourceLocator;

				// Handle resourceLocator parameter format
				let formSlug: string;
				if (typeof formSlugParam === 'object' && formSlugParam !== null && '__rl' in formSlugParam) {
					formSlug = String(formSlugParam.value || '');
				} else {
					formSlug = String(formSlugParam || '');
				}

				const staticData = this.getWorkflowStaticData('node');
				const webhookSlug = staticData.webhookSlug;

				if (!webhookSlug) {
					return false;
				}

				try {
					await this.helpers.httpRequestWithAuthentication.call(this, 'formalooApi', {
						method: 'GET',
						url: `https://api.formaloo.me/v3.0/forms/${formSlug}/webhooks/${webhookSlug}/`,
						json: true,
					});
					return true;
				} catch (error) {
					return false;
				}
			},

			create: async function (this: IHookFunctions): Promise<boolean> {
				const formSlugParam = this.getNodeParameter('formSlug') as string | INodeParameterResourceLocator;

				// Handle resourceLocator parameter format
				let formSlug: string;
				if (typeof formSlugParam === 'object' && formSlugParam !== null && '__rl' in formSlugParam) {
					formSlug = String(formSlugParam.value || '');
				} else {
					formSlug = String(formSlugParam || '');
				}
				const event = this.getNodeParameter('event') as string;
				const credentials = await this.getCredentials('formalooApi');
				const webhookUrl = this.getNodeWebhookUrl('default');

				// Validate credentials
				if (!credentials.secret_api || !credentials.api_key) {
					throw new NodeOperationError(this.getNode(), 'Missing required credentials. Please check your Formaloo API credentials.');
				}

				// Validate form slug
				if (!formSlug || formSlug.trim() === '') {
					throw new NodeOperationError(this.getNode(), 'Form is required. Please select a form from the dropdown.');
				}

				try {
					const body = {
						title: `n8n workflow on ${event}`,
						url: webhookUrl,
						form_submit_events: event === 'form_submit' || event === 'all',
						row_payment_events: event === 'payment_completed' || event === 'all',
						row_update_events: event === 'row_update' || event === 'all',
						send_raw_data: true,
						send_rendered_data: false,
					};

					const response = await this.helpers.httpRequestWithAuthentication.call(this, 'formalooApi', {
						method: 'POST',
						url: `https://api.formaloo.me/v3.0/forms/${formSlug}/webhooks/`,
						body,
						json: true,
					});

					if (response.status !== 200) {
						throw new NodeOperationError(this.getNode(), 'Failed to create webhook: No webhook ID returned');
					}

					const staticData = this.getWorkflowStaticData('node');
					staticData.webhookSlug = response.data.webhook.slug;
					staticData.formSlug = formSlug;
					staticData.event = event;

					return true;
				} catch (error) {
					throw new NodeOperationError(this.getNode(), `Failed to create Formaloo webhook: ${error.message}`);
				}
			},

			delete: async function (this: IHookFunctions): Promise<boolean> {
				const formSlugParam = this.getNodeParameter('formSlug') as string | INodeParameterResourceLocator;

				// Handle resourceLocator parameter format
				let formSlug: string;
				if (typeof formSlugParam === 'object' && formSlugParam !== null && '__rl' in formSlugParam) {
					formSlug = String(formSlugParam.value || '');
				} else {
					formSlug = String(formSlugParam || '');
				}
				const staticData = this.getWorkflowStaticData('node');
				const webhookSlug = staticData.webhookSlug;

				if (!webhookSlug) {
					return true;
				}

				try {
					await this.helpers.httpRequestWithAuthentication.call(this, 'formalooApi', {
						method: 'DELETE',
						url: `https://api.formaloo.me/v3.0/forms/${formSlug}/webhooks/${webhookSlug}/`,
						json: true,
					});

					delete staticData.webhookSlug;
					delete staticData.formSlug;
					delete staticData.event;

					return true;
				} catch (error) {
					// Don't throw error on deletion failure
					return true;
				}
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		try {
			const body = this.getRequestObject().body;
			const staticData = this.getWorkflowStaticData('node');

			// Process the webhook data
			let processedData = body;

			// If body is a string, try to parse it as JSON
			if (typeof body === 'string') {
				try {
					processedData = JSON.parse(body);
				} catch (e) {
					// Keep as string if not valid JSON
				}
			}

			// Add metadata about the webhook
			const webhookData = {
				...processedData,
				_webhook_metadata: {
					received_at: new Date().toISOString(),
					form_slug: body.form,
					event_type: staticData.event,
					webhook_slug: staticData.webhookSlug
				},
			};

			return {
				workflowData: [[{ json: webhookData }]],
			};
		} catch (error) {
			return {
				workflowData: [[
					{
						json: {
							error: error.message,
							raw_body: this.getRequestObject().body,
							timestamp: new Date().toISOString(),
						},
					},
				]],
			};
		}
	}
}
