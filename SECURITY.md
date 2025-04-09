# Security Policy for Sightline VSCode Extension

## Supported Versions

| Version | Supported          |
|---------|--------------------|
| 0.1.x   | :white_check_mark: |
| < 0.1   | :x:                |

---

## Reporting a Vulnerability

If you discover a security vulnerability, **please do NOT create a public GitHub issue**.

Instead, contact the maintainers **privately**:

- **Email:** security@lucidlayer.com (replace with your actual contact)
- Or via the GitHub repository's **security advisory** feature

We will respond promptly and coordinate a fix.

---

## Security Best Practices

- **No secrets or API keys** are stored in the extension code or package.
- All sensitive credentials should be managed via **environment variables** or **secure vaults**.
- The extension **does not collect telemetry** or user data.
- The extension **does not load remote content** in webviews.
- The extension **only executes local CLI commands** and MCP server calls.
- Dependencies are regularly reviewed and updated.

---

## Recommendations for Users

- **Keep the extension updated** to the latest version.
- **Do not share your environment variables or secrets** publicly.
- **Review the extension source code** if you have security concerns.
- **Run `npm audit`** and keep dependencies patched if building from source.

---

## Responsible Disclosure

We appreciate responsible disclosure of security issues to protect our users.

Thank you for helping keep Sightline secure.
