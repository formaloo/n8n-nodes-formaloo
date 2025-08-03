# n8n-nodes-formaloo

This package provides n8n nodes for integrating with [Formaloo](https://formaloo.com), a form builder platform.

## Nodes

### Formaloo Trigger
- **Node Name**: `Formaloo Trigger`
- **Type**: Trigger
- **Description**: Triggers workflows when forms are submitted or updated in Formaloo
- **Events Supported**:
  - Form Submit
  - Row Update
  - Payment Completed
  - All Events

### Formaloo Action
- **Node Name**: `Formaloo`
- **Type**: Action
- **Description**: Submit data to Formaloo forms
- **Operations**:
  - Submit Form: Submit data to a specific Formaloo form

## Credentials

The nodes require Formaloo API credentials with the following fields:
- **Auth Token**: JWT authentication token
- **API Key**: Your Formaloo API key
- **Workspace**: Your Formaloo workspace identifier

## Installation

1. Install the package:
   ```bash
   npm install n8n-nodes-formaloo
   ```

2. Add the nodes to your n8n instance by copying the `dist` folder to your n8n custom nodes directory.

## Usage

### Setting up the Trigger Node

1. Add a "Formaloo Trigger" node to your workflow
2. Configure your Formaloo API credentials
3. Select the form you want to monitor
4. Choose the event type (form submit, row update, etc.)
5. The node will create a webhook in Formaloo and trigger your workflow when events occur

### Setting up the Action Node

1. Add a "Formaloo" node to your workflow
2. Configure your Formaloo API credentials
3. Select the form you want to submit to
4. Add form fields with their IDs and values
5. Optionally add additional fields like submit code, recaptcha value, etc.

## API Endpoints

The nodes use the following Formaloo API endpoints:
- **Forms List**: `GET https://api.formaloo.me/v3.0/forms/`
- **Webhooks**: `POST/GET/DELETE https://api.formaloo.me/v3.0/forms/{formSlug}/webhooks/`
- **Form Submit**: `POST https://api.formaloo.me/v3.0/form-displays/slug/{formSlug}/submit/`

## Development

1. Clone the repository
2. Install dependencies: `npm install`
3. Build the project: `npm run build`
4. Test locally with n8n

## License

[MIT](LICENSE.md)
