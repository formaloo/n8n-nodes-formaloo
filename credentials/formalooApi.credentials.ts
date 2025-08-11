import {
	IAuthenticateGeneric,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class formalooApi implements ICredentialType {
	name = 'formalooApi';
	displayName = 'Formaloo API';

	documentationUrl = 'https://docs.formaloo.com/#/operations/formsWebhooksList';

	properties: INodeProperties[] = [
		{
			displayName: 'Secret API',
			name: 'secret_api',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
		},
		{
			displayName: 'API Key',
			name: 'api_key',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'X-Api-Key': '={{$credentials.api_key}}',
				'Content-Type': 'application/json',
			},
		},
	};
}
