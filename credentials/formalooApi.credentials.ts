import {
	IAuthenticateGeneric,
	ICredentialType,
	INodeProperties,
	ICredentialTestRequest,
} from 'n8n-workflow';

export class formalooApi implements ICredentialType {
	name = 'formalooApi';
	displayName = 'Formaloo API';
	documentationUrl = 'https://docs.formaloo.com';

	properties: INodeProperties[] = [
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

	// The block below tells how this credential can be tested
	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.formaloo.me/',
			url: 'v3.0/oauth2/authorization-token/',
			method: 'POST',
			headers: {
				'Authorization': '=Basic {{$credentials.secret_api}}',
				'Content-Type': 'application/json',
			},
			body: {
				grant_type: 'client_credentials',
			},
		},
	};
}
