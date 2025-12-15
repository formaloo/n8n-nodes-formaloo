import {
	ILoadOptionsFunctions,
	INodePropertyOptions,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	IResourceLocatorResult,
	INodeParameterResourceLocator,
	INodeListSearchResult,
	INodeListSearchItems,
} from 'n8n-workflow';
/**
 * Search forms for resourceLocator - used by searchListMethod
 * This method supports filtering via the filter parameter and returns INodeListSearchResult
 * When a filter is provided, it performs server-side search via the API
 * This is the new implementation for resourceLocator with search functionality
 */
export async function searchFormsForResourceLocator(this: ILoadOptionsFunctions, filter?: string, paginationToken?: string): Promise<INodeListSearchResult> {
	const credentials = await this.getCredentials('formalooApi');

	if (!credentials.secret_api || !credentials.api_key) {
		throw new Error('Missing required credentials. Please check your Formaloo API credentials.');
	}

	try {
		const apiUrl = 'https://api.formaloo.me/v3.0/forms/';
		const separator = apiUrl.includes('?') ? '&' : '?';
		let url = `${apiUrl}${separator}page_size=25`;

		// Add search parameter if filter is provided (server-side search)
		if (filter && filter.trim()) {
			url += `&search=${encodeURIComponent(filter.trim())}`;
		}

		// Handle pagination if paginationToken is provided
		// When searching, we still support pagination for search results
		if (paginationToken && typeof paginationToken === 'string') {
			url += `&page=${paginationToken}`;
		}

		const response: any = await this.helpers.httpRequestWithAuthentication.call(this, 'formalooApi', {
			method: 'GET',
			url: url,
			json: true,
		});

		if (!response.data || !Array.isArray(response.data.forms)) {
			throw new Error('Invalid response from Formaloo API');
		}

		let forms = response.data.forms.filter((form: any) => form.slug !== '');

		// Apply additional client-side filtering as fallback/refinement
		// This helps ensure we catch any matches the server-side search might have missed
		if (filter && filter.trim()) {
			const searchLower = filter.trim().toLowerCase();
			forms = forms.filter((form: any) => {
				const title = (form.title || '').toLowerCase();
				const slug = (form.slug || '').toLowerCase();
				return title.includes(searchLower) || slug.includes(searchLower);
			});
		}

		const results: INodeListSearchItems[] = forms.map((form: any) => ({
			name: `${form.title} - ${form.slug}`,
			value: form.slug,
			url: `https://api.formaloo.me/v3.0/forms/${form.slug}/`,
		}));

		// Determine if there are more pages
		// Check for next page URL in response or if we got a full page of results
		const hasMore = response.data.next || (forms.length === 25);
		const currentPage = paginationToken ? parseInt(paginationToken as string) : 1;
		const nextPageToken = hasMore ? String(currentPage + 1) : undefined;

		return {
			results,
			paginationToken: nextPageToken,
		};
	} catch (error: any) {
		throw new Error(`Failed to load forms: ${error.message}`);
	}
}

/**
 * @deprecated Use searchFormsForResourceLocator instead.
 * This function is kept for backward compatibility but is no longer used.
 */
export async function filterListForms(this: ILoadOptionsFunctions, filter?: string): Promise<IResourceLocatorResult[]> {
	const credentials = await this.getCredentials('formalooApi');

	if (!credentials.secret_api || !credentials.api_key) {
		throw new Error('Missing required credentials. Please check your Formaloo API credentials.');
	}

	try {
		const apiUrl = 'https://api.formaloo.me/v3.0/forms/';
		const separator = apiUrl.includes('?') ? '&' : '?';
		let url = `${apiUrl}${separator}page_size=25`;

		// Add search parameter if filter is provided
		if (filter && filter.trim()) {
			url += `&search=${encodeURIComponent(filter.trim())}`;
		}

		const response: any = await this.helpers.httpRequestWithAuthentication.call(this, 'formalooApi', {
			method: 'GET',
			url: url,
			json: true,
		});

		if (!response.data || !Array.isArray(response.data.forms)) {
			throw new Error('Invalid response from Formaloo API');
		}

		let forms = response.data.forms.filter((form: any) => form.slug !== '');

		// Apply client-side filtering as fallback if API doesn't support server-side search
		if (filter && filter.trim()) {
			const searchLower = filter.trim().toLowerCase();
			forms = forms.filter((form: any) => {
				const title = (form.title || '').toLowerCase();
				const slug = (form.slug || '').toLowerCase();
				return title.includes(searchLower) || slug.includes(searchLower);
			});
		}

		const results: IResourceLocatorResult[] = forms.map((form: any) => ({
			name: `${form.title} - ${form.slug}`,
			value: form.slug,
			url: `https://api.formaloo.me/v3.0/forms/${form.slug}/`,
		}));

		return results;
	} catch (error: any) {
		throw new Error(`Failed to search forms: ${error.message}`);
	}
}

/**
 * @deprecated Use searchFormsForResourceLocator for resourceLocator instead.
 * This function is kept for backward compatibility with the old 'options' type.
 */
export async function getForms(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const credentials = await this.getCredentials('formalooApi');

	if (!credentials.secret_api || !credentials.api_key) {
		throw new Error('Missing required credentials. Please check your Formaloo API credentials.');
	}

	try {
		const apiUrl = 'https://api.formaloo.me/v3.0/forms/';
		const separator = apiUrl.includes('?') ? '&' : '?';
		const url = `${apiUrl}${separator}page_size=100`;

		const response: any = await this.helpers.httpRequestWithAuthentication.call(this, 'formalooApi', {
			method: 'GET',
			url: url,
			json: true,
		});

		if (!response.data || !Array.isArray(response.data.forms)) {
			throw new Error('Invalid response from Formaloo API');
		}

		const forms = response.data.forms
			.filter((form: any) => form.slug !== '')
			.map((form: any) => ({
				name: `${form.title} - ${form.slug}`,
				value: form.slug,
			}));

		return forms;
	} catch (error: any) {
		throw new Error(`Failed to load forms: ${error.message}`);
	}
}

/**
 * @deprecated This function is kept for backward compatibility.
 * It may not work correctly with resourceLocator parameters.
 * Use getFormFieldsForResourceLocator instead when using resourceLocator.
 */
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
		const apiUrl = `https://api.formaloo.me/v3.0/forms/${formSlug}/`;

		const response = await this.helpers.httpRequestWithAuthentication.call(this, 'formalooApi', {
			method: 'GET',
			url: apiUrl,
			json: true,
		});

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

/**
 * Get form fields for resourceLocator - handles resourceLocator parameter format
 * This is the new version that works with resourceLocator type parameters
 */
export async function getFormFieldsForResourceLocator(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const credentials = await this.getCredentials('formalooApi');
	const formSlugParam = this.getNodeParameter('formSlug') as string | INodeParameterResourceLocator;

	// Handle resourceLocator parameter format
	let formSlug: string;
	if (typeof formSlugParam === 'object' && formSlugParam !== null && '__rl' in formSlugParam) {
		formSlug = String(formSlugParam.value || '');
	} else {
		formSlug = String(formSlugParam || '');
	}

	if (!credentials.secret_api || !credentials.api_key) {
		throw new Error('Missing required credentials. Please check your Formaloo API credentials.');
	}

	if (!formSlug) {
		return [];
	}

	try {
		const apiUrl = `https://api.formaloo.me/v3.0/forms/${formSlug}/`;

		const response = await this.helpers.httpRequestWithAuthentication.call(this, 'formalooApi', {
			method: 'GET',
			url: apiUrl,
			json: true,
		});

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
		const apiUrl = `https://api.formaloo.me/v3.0/fields/${fieldSlug}/`;

		const response = await this.helpers.httpRequestWithAuthentication.call(this, 'formalooApi', {
			method: 'GET',
			url: apiUrl,
			json: true,
		});

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
		const apiUrl = `https://api.formaloo.me/v4/fields/${fieldSlug}/choices/?search=${encodeURIComponent(searchValue)}`;

		const response = await this.helpers.httpRequestWithAuthentication.call(this, 'formalooApi', {
			method: 'GET',
			url: apiUrl,
			json: true,
		});

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

/**
 * @deprecated JWT token fetching is now handled automatically by the credential's authenticate method.
 * This function is kept for backward compatibility but should not be used in new code.
 * Use httpRequestWithAuthentication instead, which automatically handles authentication.
 */
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

		const response = await this.helpers.request(authUrl, options);

		if (response && response.authorization_token) {
			return response.authorization_token;
		} else {
			throw new Error('Failed to get JWT token from authentication endpoint');
		}
	} catch (error) {
		throw new Error(`Authentication failed: ${error.message}`);
	}
}

/**
 * @deprecated JWT token fetching is now handled automatically by the credential's authenticate method.
 * This function is kept for backward compatibility but should not be used in new code.
 * Use httpRequestWithAuthentication instead, which automatically handles authentication.
 */
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

		const response = await this.helpers.request(authUrl, options);

		if (response && response.authorization_token) {
			return response.authorization_token;
		} else {
			throw new Error('Failed to get JWT token from authentication endpoint');
		}
	} catch (error) {
		throw new Error(`Authentication failed: ${error.message}`);
	}
}

/**
 * @deprecated JWT token fetching is now handled automatically by the credential's authenticate method.
 * This function is kept for backward compatibility but should not be used in new code.
 * Use httpRequestWithAuthentication instead, which automatically handles authentication.
 */
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

		const response = await this.helpers.request(authUrl, options);

		if (response && response.authorization_token) {
			return response.authorization_token;
		} else {
			throw new Error('Failed to get JWT token from authentication endpoint');
		}
	} catch (error) {
		throw new Error(`Authentication failed: ${error.message}`);
	}
}

