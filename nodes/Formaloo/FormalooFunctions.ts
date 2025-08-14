import {
	ILoadOptionsFunctions,
	INodePropertyOptions,
	IHttpRequestMethods,
	IExecuteFunctions,
	IHookFunctions,
} from 'n8n-workflow';

export async function getForms(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const credentials = await this.getCredentials('formalooApi');

	if (!credentials.secret_api || !credentials.api_key) {
		throw new Error('Missing required credentials. Please check your Formaloo API credentials.');
	}

	try {
		// Get JWT token using Basic authentication
		const jwtToken = await getJWTToken.call(this, credentials.secret_api as string);

		const apiUrl = 'https://api.formaloo.me/v3.0/forms/';

		const options = {
			method: 'GET' as IHttpRequestMethods,
			headers: {
				'Authorization': `JWT ${jwtToken}`,
				'X-Api-Key': credentials.api_key,
				'Content-Type': 'application/json',
			},
			json: true,
		};

		const response = await this.helpers.request!(apiUrl, options);

		if (!response.data || !Array.isArray(response.data.forms)) {
			throw new Error('Invalid response from Formaloo API');
		}

		const forms = response.data.forms.filter((form: any) => form.slug !== '').map((form: any) => ({
			name: `${form.title} - ${form.slug}`,
			value: form.slug
		}));

		return forms;
	} catch (error) {
		throw new Error(`Failed to load forms: ${error.message}`);
	}
}

export async function getFormFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const credentials = await this.getCredentials('formalooApi');
	const formSlug = this.getNodeParameter('formSlug') as string;

	if (!credentials.secret_api || !credentials.api_key) {
		throw new Error('Missing required credentials. Please check your Formaloo API credentials.');
	}

	if (!formSlug) {
		return [];
	}

	try {
		// Get JWT token using Basic authentication
		const jwtToken = await getJWTToken.call(this, credentials.secret_api as string);

		const apiUrl = `https://api.formaloo.me/v3.0/forms/${formSlug}/`;

		const options = {
			method: 'GET' as IHttpRequestMethods,
			headers: {
				'Authorization': `JWT ${jwtToken}`,
				'X-Api-Key': credentials.api_key,
				'Content-Type': 'application/json',
			},
			json: true,
		};

		const response = await this.helpers.request!(apiUrl, options);

		if (!response.data || !response.data.form || !Array.isArray(response.data.form.fields_list)) {
			throw new Error('Invalid response from Formaloo API');
		}

		const fields = response.data.form.fields_list
			.filter((field: any) => field.type !== 'success_page' && field.title && field.slug)
			.map((field: any) => ({
				name: field.title,
				value: field.slug,
			}));

		return fields;
	} catch (error) {
		throw new Error(`Failed to load form fields: ${error.message}`);
	}
}

export async function getJWTToken(this: ILoadOptionsFunctions, secretApi: string): Promise<string> {
	try {
		const authUrl = 'https://api.formaloo.me/v3.0/oauth2/authorization-token/';
		const options = {
			method: 'POST' as IHttpRequestMethods,
			body: {
				grant_type: 'client_credentials',
			},
			headers: {
				'Authorization': `Basic ${secretApi}`,
			},
			json: true,
		};


		const response = await this.helpers.request!(authUrl, options);

		if (response && response.authorization_token) {
			return response.authorization_token;
		} else {
			throw new Error('Failed to get JWT token from authentication endpoint');
		}
	} catch (error) {
		throw new Error(`Authentication failed: ${error.message}`);
	}
}

export async function getJWTTokenExecute(this: IExecuteFunctions, secretApi: string): Promise<string> {
	try {
		const authUrl = 'https://api.formaloo.me/v3.0/oauth2/authorization-token/';

		const options = {
			method: 'POST' as IHttpRequestMethods,
			body: {
				grant_type: 'client_credentials',
			},
			headers: {
				'Authorization': `Basic ${secretApi}`,
				'Content-Type': 'application/json',
			},
			json: true,
		};

		const response = await this.helpers.request!(authUrl, options);

		if (response && response.authorization_token) {
			return response.authorization_token;
		} else {
			throw new Error('Failed to get JWT token from authentication endpoint');
		}
	} catch (error) {
		throw new Error(`Authentication failed: ${error.message}`);
	}
}

export async function getJWTTokenHook(this: IHookFunctions, secretApi: string): Promise<string> {
	try {
		const authUrl = 'https://api.formaloo.me/v3.0/oauth2/authorization-token/';
		const options = {
			method: 'POST' as IHttpRequestMethods,
			body: {
				grant_type: 'client_credentials',
			},
			headers: {
				'Authorization': `Basic ${secretApi}`,
				'Content-Type': 'application/json',
			},
			json: true,
		};

		const response = await this.helpers.request!(authUrl, options);

		if (response && response.authorization_token) {
			return response.authorization_token;
		} else {
			throw new Error('Failed to get JWT token from authentication endpoint');
		}
	} catch (error) {
		throw new Error(`Authentication failed: ${error.message}`);
	}
}
