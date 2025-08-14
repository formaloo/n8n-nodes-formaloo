import {
	INodeType,
	INodeTypeDescription,
	IExecuteFunctions,
	INodeExecutionData,
	NodeConnectionType,
	IHttpRequestMethods,
	NodeOperationError,
} from 'n8n-workflow';

import { getForms, getFormFields, getJWTTokenExecute } from './FormalooFunctions';

export class Formaloo implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Formaloo',
		name: 'formaloo',
		icon: 'file:formaloo-picture.png',
		group: ['transform'],
		defaultVersion: 1,
    version: [1],
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
				required: true,
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
				displayName: 'Form Name',
				name: 'formSlug',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getForms',
				},
				default: '',
				description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
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
								displayName: 'Field Name',
								name: 'fieldId',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getFormFields',
								},
								default: '',
								description: 'The field ID from the form. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
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
		],
	};

	methods = {
		loadOptions: {
			getForms,
			getFormFields,
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

					const credentials = await this.getCredentials('formalooApi');

					// Validate credentials
					if (!credentials.secret_api || !credentials.api_key) {
						throw new NodeOperationError(this.getNode(), 'Missing required credentials. Please check your Formaloo API credentials.');
					}

					// Validate form slug
					if (!formSlug || formSlug.trim() === '') {
						throw new NodeOperationError(this.getNode(), 'Form is required. Please select a form from the dropdown.');
					}

					// Get JWT token using Basic authentication
					const jwtToken = await getJWTTokenExecute.call(this, credentials.secret_api as string);

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

					// Make the API request
					const apiUrl = `https://api.formaloo.me/v3.0/form-displays/slug/${formSlug}/submit/`;

					const options = {
						method: 'POST' as IHttpRequestMethods,
						body: requestBody,
						headers: {
							'Authorization': `JWT ${jwtToken}`,
							'X-Api-Key': credentials.api_key,
							'Content-Type': 'application/json',
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
