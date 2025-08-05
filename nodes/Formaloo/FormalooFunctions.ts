import {
	ILoadOptionsFunctions,
	INodePropertyOptions,
	IHttpRequestMethods,
} from 'n8n-workflow';

export async function getForms(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const credentials = await this.getCredentials('formalooApi');

	if (!credentials.authToken || !credentials.apiKey || !credentials.workspace) {
		throw new Error('Missing required credentials. Please check your Formaloo API credentials.');
	}

	try {
		const apiUrl = 'https://api.formaloo.me/v3.0/forms/';

		const options = {
			method: 'GET' as IHttpRequestMethods,
			headers: {
				'Authorization': `JWT ${credentials.authToken}`,
				'X-Api-Key': credentials.apiKey,
				'X-Workspace': credentials.workspace,
				'Content-Type': 'application/json',
			},
			json: true,
		};

		const response = await this.helpers.request!(apiUrl, options);

		if (!response.data || !Array.isArray(response.data.forms)) {
			console.log('getForms error:', response);
			throw new Error('Invalid response from Formaloo API');
		}

		const forms = response.data.forms.map((form: any) => ({
			name: form.title,
			value: form.slug,
			description: form.description,
		}));

		console.log('Forms parsed successfully');

		return forms;
	} catch (error) {
		throw new Error(`Failed to load forms: ${error.message}`);
	}
}

export async function getFormFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const credentials = await this.getCredentials('formalooApi');
	const formSlug = this.getNodeParameter('formSlug') as string;

	if (!credentials.authToken || !credentials.apiKey || !credentials.workspace) {
		throw new Error('Missing required credentials. Please check your Formaloo API credentials.');
	}

	if (!formSlug) {
		return [];
	}

	try {
		const apiUrl = `https://api.formaloo.me/v3.0/forms/${formSlug}/`;

		const options = {
			method: 'GET' as IHttpRequestMethods,
			headers: {
				'Authorization': `JWT ${credentials.authToken}`,
				'X-Api-Key': credentials.apiKey,
				'X-Workspace': credentials.workspace,
				'Content-Type': 'application/json',
			},
			json: true,
		};

		const response = await this.helpers.request!(apiUrl, options);

		if (!response.data || !response.data.form || !Array.isArray(response.data.form.fields_list)) {
			console.log('getFormFields error:', response);
			throw new Error('Invalid response from Formaloo API');
		}

		const fields = response.data.form.fields_list.map((field: any) => ({
			name: field.title,
			value: field.slug,
			description: field.description,
		}));

		console.log('Form fields parsed successfully');

		return fields;
	} catch (error) {
		throw new Error(`Failed to load form fields: ${error.message}`);
	}
}
