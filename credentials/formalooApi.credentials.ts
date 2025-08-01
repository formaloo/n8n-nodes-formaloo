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
			displayName: 'Auth Token',
			name: 'authToken',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
		},
		{
			displayName: 'Workspace',
			name: 'workspace',
			type: 'string',
			default: '',
			required: true,
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'Authorization': 'JWT {{$credentials.authToken}}',
				'X-Api-Key': '={{$credentials.apiKey}}',
				'X-Workspace': '={{$credentials.workspace}}',
			},
		},
	};
}
