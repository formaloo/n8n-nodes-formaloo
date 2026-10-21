import {
	ICredentialType,
	INodeProperties,
	ICredentialTestRequest,
	ICredentialDataDecryptedObject,
	IHttpRequestOptions,
	type Icon,
} from 'n8n-workflow';

import { readFormalooApiKey } from '../nodes/Formaloo/FormalooFunctions';


export class formalooApi implements ICredentialType {
	name = 'formalooApi';
	displayName = 'Formaloo API';
	icon: Icon = {
		light: 'file:../nodes/Formaloo/formaloo-picture.svg',
		dark: 'file:../nodes/Formaloo/formaloo-picture.dark.svg',
	};

	documentationUrl = 'https://docs.formaloo.com';

	properties: INodeProperties[] = [
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
		requestOptions: IHttpRequestOptions
	): Promise<IHttpRequestOptions> {
		let jwtToken: string;

		const apiKey = readFormalooApiKey(credentials);

		if (!credentials.secret_api || !apiKey) {
			throw new Error('Missing required credentials. Please check your Formaloo API credentials.');
		}

		try {
			// Fetch JWT token using Basic authentication
			const authUrl = 'https://api.formaloo.me/v3.0/oauth2/authorization-token/';
			const response = await fetch(authUrl, {
				method: 'POST',
				headers: {
					'Authorization': `Basic ${String(credentials.secret_api)}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					grant_type: 'client_credentials',
				}),
			});

			if (!response.ok) {
				const errorText = await response.text().catch(() => response.statusText);
				throw new Error(`Authentication failed: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
			}

			const data = await response.json() as { authorization_token?: string };
			jwtToken = data.authorization_token || '';

			if (!jwtToken) {
				throw new Error('Failed to get JWT token from authentication endpoint');
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			throw new Error(`Authentication failed: ${message}`);
		}

		// Merge authentication headers with existing request options
		// The authenticate method should return modified requestOptions with headers merged
		requestOptions.headers = {
			...requestOptions.headers,
      'Authorization': `JWT ${jwtToken}`,
			'X-Api-Key': apiKey,
			'Content-Type': 'application/json',
		};

		return requestOptions;
	}

	// The block below tells how this credential can be tested
	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.formaloo.me/',
			url: 'v3.0/profile/',
			method: 'GET',
			json: true,
		},
	};
}
