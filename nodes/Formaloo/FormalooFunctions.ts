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

		let allForms: any[] = [];
		let nextUrl = 'https://api.formaloo.me/v3.0/forms/';

		// Fetch all pages
		while (nextUrl) {
			const options = {
				method: 'GET' as IHttpRequestMethods,
				headers: {
					'Authorization': `JWT ${jwtToken}`,
					'X-Api-Key': credentials.api_key,
					'Content-Type': 'application/json',
				},
				json: true,
			};

			const response = await this.helpers.request!(nextUrl, options);

			if (!response.data || !Array.isArray(response.data.forms)) {
			throw new Error('Invalid response from Formaloo API');
			}

			// Add forms from current page
			allForms = allForms.concat(response.data.forms);

			// Check if there's a next page
			nextUrl = response.data.next || null;
		}

		const forms = allForms.filter((form: any) => form.slug !== '').map((form: any) => ({
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
			.filter((field: any) =>
				!['success_page',
					'matrix',
					'table',
					'lookup',
					'user',
					'profile',
					'linked_rows',
					'repeating_section'
				].includes(field.type) &&
				field.title &&
				field.slug
			)
			.map((field: any) => ({
				name: `${field.title} - ${field.type}`,
				value: `${field.slug} - ${field.type}`,
			}));

		return fields;
	} catch (error) {
		throw new Error(`Failed to load form fields: ${error.message}`);
	}
}

export async function getFieldOptionsExecute(this: IExecuteFunctions, fieldSlug: string): Promise<Array<{title: string, slug: string}>> {
	const credentials = await this.getCredentials('formalooApi');

	if (!credentials.secret_api || !credentials.api_key) {
		throw new Error('Missing required credentials. Please check your Formaloo API credentials.');
	}

	if (!fieldSlug) {
		return [];
	}

	try {
		// Get JWT token using Basic authentication
		const jwtToken = await getJWTTokenExecute.call(this, credentials.secret_api as string);

		const apiUrl = `https://api.formaloo.me/v3.0/fields/${fieldSlug}/`;

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

		if (!response.data || !response.data.field || !response.data.field.choice_items) {
			throw new Error('Invalid response from Formaloo API or no options found');
		}

		const fieldOptions = response.data.field.choice_items.map((option: any) => ({
			title: option.title,
			slug: option.slug,
		}));

		return fieldOptions;
	} catch (error) {
		throw new Error(`Failed to load field options: ${error.message}`);
	}
}

export async function searchCityCountryChoices(this: IExecuteFunctions, fieldSlug: string, searchValue: string): Promise<{slug: string, title: string} | null> {
	const credentials = await this.getCredentials('formalooApi');

	if (!credentials.secret_api || !credentials.api_key) {
		throw new Error('Missing required credentials. Please check your Formaloo API credentials.');
	}

	if (!fieldSlug || !searchValue) {
		return null;
	}

	try {
		// Get JWT token using Basic authentication
		const jwtToken = await getJWTTokenExecute.call(this, credentials.secret_api as string);

		const apiUrl = `https://api.formaloo.me/v4/fields/${fieldSlug}/choices/?search=${encodeURIComponent(searchValue)}`;

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

		if (!response.data || !response.data.objects || !Array.isArray(response.data.objects)) {
			throw new Error('Invalid response from Formaloo API');
		}

		const results = response.data.objects;
		const count = response.data.count;

		// Case 1: No results found
		if (count === 0) {
			throw new Error(`No city/country found for search term: "${searchValue}"`);
		}

		// Case 2: More than one result - check for exact match
		if (count > 1) {
			const exactMatches = results.filter((item: any) =>
				item.title.toLowerCase() === searchValue.toLowerCase()
			);

			if (exactMatches.length === 1) {
				// Found exact match
				return {
					slug: exactMatches[0].slug,
					title: exactMatches[0].title
				};
			} else if (exactMatches.length > 1) {
				// Multiple exact matches (shouldn't happen but handle it)
				throw new Error(`Multiple exact matches found for "${searchValue}": ${exactMatches.map((m: any) => m.title).join(', ')}`);
			} else {
				// No exact match, show available options
				const suggestions = results.slice(0, 10).map((item: any) => item.title).join(', ');
				throw new Error(`No exact match found for "${searchValue}". Available options include: ${suggestions}${count > 10 ? '...' : ''}`);
			}
		}

		// Case 3: Exactly one result
		if (count === 1 && results.length === 1) {
			return {
				slug: results[0].slug,
				title: results[0].title
			};
		}

		return null;
	} catch (error) {
		throw new Error(`Failed to search city/country choices: ${error.message}`);
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
