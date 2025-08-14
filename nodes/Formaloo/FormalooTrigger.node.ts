import {
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	IWebhookResponseData,
	NodeConnectionType,
	NodeOperationError,
} from 'n8n-workflow';

import { getForms } from './FormalooFunctions';

export class FormalooTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Formaloo Trigger',
		name: 'formalooTrigger',
		icon: 'file:formaloo-picture.png',
		group: ['trigger'],
		version: 1,
		description: 'Trigger workflow on Formaloo form submissions and updates',
		defaults: {
			name: 'Formaloo Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionType.Main],
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
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getForms',
				},
				default: '',
				description: 'Select the Formaloo form to watch. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				required: true,
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
	}

	webhookMethods = {
		default: {
			checkExists: async function (this: IHookFunctions): Promise<boolean> {
				const formSlug = this.getNodeParameter('formSlug') as string;
				const credentials = await this.getCredentials('formalooApi');
				const staticData = this.getWorkflowStaticData('node');
				const webhookSlug = staticData.webhookSlug;

				if (!webhookSlug) {
					return false;
				}

				try {
					const apiUrl = `https://api.formaloo.me/v3.0/forms/${formSlug}/webhooks/${webhookSlug}/`;
					const options = {
						method: 'GET' as IHttpRequestMethods,
						headers: {
							'Authorization': `JWT ${credentials.authToken}`,
							'X-Api-Key': credentials.apiKey,
							'X-Workspace': credentials.workspace,
							'Content-Type': 'application/json',
						},
						json: true,
					};

					await this.helpers.request!(apiUrl, options);
					return true;
				} catch (error) {
					return false;
				}
			},

			create: async function (this: IHookFunctions): Promise<boolean> {
				const formSlug = this.getNodeParameter('formSlug') as string;
				const event = this.getNodeParameter('event') as string;
				const credentials = await this.getCredentials('formalooApi');
				const webhookUrl = this.getNodeWebhookUrl('default');

				// Validate credentials
				if (!credentials.authToken || !credentials.apiKey || !credentials.workspace) {
					throw new NodeOperationError(this.getNode(), 'Missing required credentials. Please check your Formaloo API credentials.');
				}

				// Validate form slug
				if (!formSlug || formSlug.trim() === '') {
					throw new NodeOperationError(this.getNode(), 'Form is required. Please select a form from the dropdown.');
				}

				try {
					const apiUrl = `https://api.formaloo.me/v3.0/forms/${formSlug}/webhooks/`;
					const body = {
						title: `n8n workflow on ${event}`,
						url: webhookUrl,
						form_submit_events: event === 'form_submit' || event === 'all',
						row_payment_events: event === 'payment_completed' || event === 'all',
						row_update_events: event === 'row_update' || event === 'all',
						send_raw_data: true,
						send_rendered_data: false,
					};

					const options = {
						method: 'POST' as IHttpRequestMethods,
						body,
						headers: {
							'Authorization': `JWT ${credentials.authToken}`,
							'X-Api-Key': credentials.apiKey,
							'X-Workspace': credentials.workspace,
							'Content-Type': 'application/json',
						},
						json: true,
					};

					const response = await this.helpers.request!(apiUrl, options);

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
				const formSlug = this.getNodeParameter('formSlug') as string;
				const credentials = await this.getCredentials('formalooApi');
				const staticData = this.getWorkflowStaticData('node');
				const webhookSlug = staticData.webhookSlug;

				if (!webhookSlug) {
					return true;
				}

				try {
					const apiUrl = `https://api.formaloo.me/v3.0/forms/${formSlug}/webhooks/${webhookSlug}/`;
					const options = {
						method: 'DELETE' as IHttpRequestMethods,
						headers: {
							'Authorization': `JWT ${credentials.authToken}`,
							'X-Api-Key': credentials.apiKey,
							'X-Workspace': credentials.workspace,
							'Content-Type': 'application/json',
						},
						json: true,
					};

					await this.helpers.request!(apiUrl, options);

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
