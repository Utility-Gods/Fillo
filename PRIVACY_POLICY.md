# Privacy Policy for Fillo

**Last Updated:** June 18, 2025

## Overview

Fillo is a Chrome extension designed to help developers by intelligently filling form fields on localhost development sites using AI language models. This privacy policy explains how Fillo collects, uses, and protects your data.

## Data Collection and Usage

### What Data We Collect

1. **API Keys and Configuration**
   - API keys for language model providers (OpenAI, Anthropic, Google, Ollama)
   - Provider settings and model preferences
   - Creativity level preferences
   - General extension settings

2. **Form Field Data (Localhost Only)**
   - Form field types and labels detected on localhost sites
   - Generated content for caching purposes
   - Page context (titles, meta tags) from localhost sites only

3. **Usage Data**
   - Cache hit/miss statistics
   - Error logs (no personal data included)
   - Performance metrics

### How We Use Your Data

1. **Primary Functions**
   - Generate contextually appropriate content for form fields
   - Cache responses to reduce API calls and improve performance
   - Provide personalized AI-generated content based on your creativity preferences

2. **Performance Optimization**
   - Store generated content locally to avoid duplicate API calls
   - Monitor extension performance to identify and fix issues

### Data Storage

1. **Local Storage Only**
   - All data is stored locally on your device using Chrome's storage API
   - API keys are encrypted before storage
   - No data is transmitted to Fillo's servers

2. **Temporary Cache**
   - Generated content is cached locally with expiration times
   - Cache can be manually cleared through the extension settings

## Data Sharing

### Third-Party Services

Fillo integrates with the following AI providers when you configure and use them:

1. **OpenAI** - When using OpenAI models, your prompts are sent to OpenAI's API
2. **Anthropic** - When using Claude models, your prompts are sent to Anthropic's API
3. **Google** - When using Gemini models, your prompts are sent to Google's API
4. **Ollama** - When using local Ollama models, data stays on your local machine

**Important:** Your API keys and generated content are only shared with the specific AI provider you choose to use for each request.

### No Data Sales or Marketing

- Fillo does not sell your data to third parties
- Fillo does not use your data for advertising or marketing purposes
- Fillo does not share your data with any parties other than the AI providers you explicitly configure

## Security Measures

1. **API Key Protection**
   - API keys are encrypted using Chrome's storage encryption
   - Keys are never logged or transmitted outside of API calls
   - Keys are automatically cleared if the extension is uninstalled

2. **Localhost Restriction**
   - Extension only operates on localhost development sites
   - No data collection from production or public websites
   - Hostname validation prevents accidental activation on non-localhost sites

3. **Minimal Permissions**
   - Extension requests only necessary Chrome permissions
   - No access to browsing history or personal files
   - No network access beyond configured AI provider APIs

## Your Rights and Controls

### Data Management

1. **Access and Control**
   - View all stored settings through the extension's settings panel
   - Export or delete cached data at any time
   - Change or remove API keys whenever desired

2. **Cache Management**
   - Clear all cached responses through settings
   - Set cache expiration preferences
   - View cache statistics and usage

### Opt-Out Options

1. **Disable Features**
   - Turn off specific AI providers
   - Disable caching functionality
   - Adjust or disable automatic form detection

2. **Complete Removal**
   - Uninstalling the extension removes all local data
   - No residual data remains after uninstallation

## Compliance with AI Provider Policies

When using Fillo, you are also subject to the privacy policies and terms of service of the AI providers you configure:

- [OpenAI Privacy Policy](https://openai.com/privacy/)
- [Anthropic Privacy Policy](https://www.anthropic.com/privacy)
- [Google Privacy Policy](https://policies.google.com/privacy)
- [Ollama Privacy Policy](https://ollama.ai/privacy)

## Children's Privacy

Fillo is designed for developers and is not intended for use by children under 13. We do not knowingly collect personal information from children under 13.

## Changes to This Policy

We may update this privacy policy from time to time. When we do:

1. The "Last Updated" date will be revised
2. Significant changes will be highlighted in extension update notes
3. Continued use of the extension constitutes acceptance of the updated policy

## Contact Information

For questions about this privacy policy or Fillo's data practices:

- **GitHub Issues:** [Report privacy concerns](https://github.com/Utility-Gods/Fillo)
- **Extension Support:** Use the feedback option in the extension settings

## Transparency Commitment

Fillo is committed to transparency in data handling:

1. **Open Source Consideration:** We are exploring open-sourcing portions of Fillo to increase transparency
2. **Regular Audits:** We regularly review our data practices to ensure compliance with this policy
3. **User Education:** We provide clear information about how your data is used within the extension interface

## Data Retention

1. **API Keys:** Stored until manually removed or extension uninstalled
2. **Cache Data:** Automatically expires based on your settings (default: 30 days)
3. **Settings:** Stored until manually reset or extension uninstalled
4. **Usage Statistics:** Cleared with each extension update or manual reset

By using Fillo, you acknowledge that you have read and understood this privacy policy and agree to the data practices described herein.
