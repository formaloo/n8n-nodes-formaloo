import {
	ICredentialType,
	INodeProperties,
	ICredentialTestRequest,
	ICredentialDataDecryptedObject,
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

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: any
	): Promise<any> {
		let jwtToken: string;

		if (!credentials.secret_api || !credentials.api_key) {
			throw new Error('Missing required credentials. Please check your Formaloo API credentials.');
		}

		try {
			// Fetch JWT token using Basic authentication
			const authUrl = 'https://api.formaloo.me/v3.0/oauth2/authorization-token/';
			const response = await fetch(authUrl, {
				method: 'POST',
				headers: {
					'Authorization': `Basic ${credentials.secret_api}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					grant_type: 'client_credentials',
				}),
			});

			if (!response.ok) {
				throw new Error(`Authentication failed: ${response.statusText}`);
			}

			const data = await response.json() as { authorization_token?: string };
			jwtToken = data.authorization_token || '';

			if (!jwtToken) {
				throw new Error('Failed to get JWT token from authentication endpoint');
			}
		} catch (error: any) {
			throw new Error(`Authentication failed: ${error.message}`);
		}

		// Return authentication headers with JWT token
		return {
			headers: {
				'Authorization': `JWT ${jwtToken}`,
				'X-Api-Key': credentials.api_key,
				'Content-Type': 'application/json',
			},
		};
	}

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
