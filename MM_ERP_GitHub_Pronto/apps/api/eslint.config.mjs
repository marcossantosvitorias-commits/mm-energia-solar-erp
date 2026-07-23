import js from '@eslint/js';
import importPlugin from 'eslint-plugin-import';
import globals from 'globals';

export default [
	{ ignores: ['node_modules/**'] },
	js.configs.recommended,
	{
		files: ['**/*.js'],
		plugins: { import: importPlugin },
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
			globals: {
				...globals.node,
			}
		},
		settings: {
			'import/resolver': {
				node: { extensions: ['.js'] },
			},
		},
		rules: {
			...importPlugin.flatConfigs.recommended.rules,
			'no-console': 'off',
			'no-unused-vars': 'off',
			'no-undef': 'error',
			'import/no-named-as-default': 'off',
			'import/no-named-as-default-member': 'off',
			'import/no-self-import': 'error',
			'import/no-cycle': 'off',
		},
	},
];
