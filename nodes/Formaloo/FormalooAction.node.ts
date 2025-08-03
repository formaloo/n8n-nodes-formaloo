import {
	INodeType,
	INodeTypeDescription,
	IExecuteFunctions,
	INodeExecutionData,
	NodeConnectionType,
	IHttpRequestMethods,
} from 'n8n-workflow';

import { getForms } from './FormalooFunctions';

export class FormalooAction implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Formaloo',
		name: 'formaloo',
		icon: 'file:formaloo-picture.png',
		group: ['transform'],
		version: 1,
		description: 'Submit data to Formaloo forms',
		defaults: {
			name: 'Formaloo',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'formalooApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Submit Form',
						value: 'submitForm',
						description: 'Submit data to a Formaloo form',
						action: 'Submit data to a formaloo form',
					},
				],
				default: 'submitForm',
			},
			{
				displayName: 'Form Name or ID',
				name: 'formSlug',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getForms',
				},
				default: '',
				description: 'Select the Formaloo form to submit to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				required: true,
				displayOptions: {
					show: {
						operation: ['submitForm'],
					},
				},
			},
			{
				displayName: 'Form Data',
				name: 'formData',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				description: 'The form data to submit',
				required: true,
				displayOptions: {
					show: {
						operation: ['submitForm'],
					},
				},
				options: [
					{
						name: 'fields',
						displayName: 'Fields',
						values: [
							{
								displayName: 'Field ID',
								name: 'fieldId',
								type: 'string',
								default: '',
								description: 'The field ID from the form',
								required: true,
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'The value to submit for this field',
								required: true,
							},
						],
					},
				],
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						operation: ['submitForm'],
					},
				},
				options: [
					{
						displayName: 'Submit Code',
						name: 'submitCode',
						type: 'string',
						default: '',
						description: 'Optional submit code for the form',
					},
					{
						displayName: 'Recaptcha Value',
						name: 'recaptchaValue',
						type: 'string',
						default: '',
						description: 'Recaptcha value if the form has recaptcha enabled',
					},
					{
						displayName: 'Submitter Referer Address',
						name: 'submitterRefererAddress',
						type: 'string',
						default: '',
						description: 'The referer address for the submission',
					},
					{
						displayName: 'Submit Time',
						name: 'submitTime',
						type: 'string',
						default: '',
						description: 'The submit time in HH:MM:SS format',
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			getForms,
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;

				if (operation === 'submitForm') {
					const formSlug = this.getNodeParameter('formSlug', i) as string;
					const formData = this.getNodeParameter('formData', i) as {
						fields: Array<{ fieldId: string; value: string }>;
					};
					const additionalFields = this.getNodeParameter('additionalFields', i) as {
						submitCode?: string;
						recaptchaValue?: string;
						submitterRefererAddress?: string;
						submitTime?: string;
					};

					const credentials = await this.getCredentials('formalooApi');

					// Validate credentials
					if (!credentials.authToken || !credentials.apiKey || !credentials.workspace) {
						throw new Error('Missing required credentials. Please check your Formaloo API credentials.');
					}

					// Validate form slug
					if (!formSlug || formSlug.trim() === '') {
						throw new Error('Form is required. Please select a form from the dropdown.');
					}

					// Build the request body
					const requestBody: any = {};

					// Add form fields
					if (formData.fields && Array.isArray(formData.fields)) {
						for (const field of formData.fields) {
							if (field.fieldId && field.value !== undefined) {
								requestBody[field.fieldId] = field.value;
							}
						}
					}

					// Add additional fields
					if (additionalFields.submitCode) {
						requestBody.submit_code = additionalFields.submitCode;
					}
					if (additionalFields.recaptchaValue) {
						requestBody.recaptcha_value = additionalFields.recaptchaValue;
					}
					if (additionalFields.submitterRefererAddress) {
						requestBody.submitter_referer_address = additionalFields.submitterRefererAddress;
					}
					if (additionalFields.submitTime) {
						requestBody.submit_time = additionalFields.submitTime;
					}

					// Make the API request
					const apiUrl = `https://api.formaloo.me/v3.0/form-displays/slug/${formSlug}/submit/`;

					const options = {
						method: 'POST' as IHttpRequestMethods,
						body: requestBody,
						headers: {
							'accept': 'application/json',
							'accept-language': 'en-US,en;q=0.9,fa;q=0.8,tr;q=0.7',
							'content-type': 'application/json',
							'origin': 'https://leitner-box.formaloo.me',
							'priority': 'u=1, i',
							'sec-ch-ua': '"Chromium";v="136", "Google Chrome";v="136", "Not.A/Brand";v="99"',
							'sec-ch-ua-mobile': '?0',
							'sec-ch-ua-platform': '"Linux"',
							'sec-fetch-dest': 'empty',
							'sec-fetch-mode': 'cors',
							'sec-fetch-site': 'same-site',
							'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
							'x-api-key': credentials.apiKey,
							'x-workspace': credentials.workspace,
						},
						json: true,
					};

					const response = await this.helpers.request!(apiUrl, options);

					returnData.push({
						json: {
							success: true,
							response: response,
							submittedData: requestBody,
							formSlug: formSlug,
							timestamp: new Date().toISOString(),
						},
					});
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							success: false,
							error: error.message,
							timestamp: new Date().toISOString(),
						},
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
