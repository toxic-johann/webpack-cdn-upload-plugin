module.exports = {
    "env": {
        "browser": true,
        "es6": true
    },
    "extends": [],
    "rules": {
        "@typescript-eslint/await-thenable": "error",
        "@typescript-eslint/class-name-casing": "error",
        // "@typescript-eslint/member-delimiter-style": [
        //     "error",
        //     {
        //         "multiline": {
        //             "delimiter": "none",
        //             "requireLast": true
        //         },
        //         "singleline": {
        //             "delimiter": "semi",
        //             "requireLast": false
        //         }
        //     }
        // ],
        // "@typescript-eslint/no-angle-bracket-type-assertion": "error",
        "@typescript-eslint/no-empty-function": "error",
        "@typescript-eslint/no-floating-promises": "off",
        "@typescript-eslint/no-misused-new": "error",
        "@typescript-eslint/no-unnecessary-qualifier": "error",
        "@typescript-eslint/no-unnecessary-type-assertion": "error",
        "@typescript-eslint/prefer-namespace-keyword": "error",
        "@typescript-eslint/quotes": [
            "error",
            "single",
            {
                "avoidEscape": true
            }
        ],
        // "@typescript-eslint/semi": [
        //     "error",
        //     null
        // ],
        // "@typescript-eslint/space-within-parens": [
        //     "error",
        //     "always"
        // ],
        "@typescript-eslint/type-annotation-spacing": "error",
        "@typescript-eslint/unified-signatures": "error",
        "camelcase": "error",
        "curly": [
            "error",
            "multi-line"
        ],
        "eol-last": "error",
        "eqeqeq": [
            "error",
            "smart"
        ],
        "id-blacklist": [
            "error",
            "any",
            "Number",
            "number",
            "String",
            "string",
            "Boolean",
            "boolean",
            "Undefined",
            "undefined"
        ],
        "id-match": "error",
        "new-parens": "error",
        "no-caller": "error",
        "no-cond-assign": "error",
        "no-console": [
            "error",
            {
                "allow": [
                    "dir",
                    "time",
                    "timeEnd",
                    "timeLog",
                    "trace",
                    "assert",
                    "clear",
                    "count",
                    "countReset",
                    "group",
                    "groupEnd",
                    "table",
                    "debug",
                    "dirxml",
                    "groupCollapsed",
                    "Console",
                    "profile",
                    "profileEnd",
                    "timeStamp",
                    "context"
                ]
            }
        ],
        "no-constant-condition": "error",
        "no-control-regex": "error",
        "no-duplicate-imports": "error",
        "no-empty": "error",
        "no-eval": "error",
        "no-fallthrough": "error",
        "no-invalid-regexp": "error",
        "no-multiple-empty-lines": "error",
        "no-redeclare": "error",
        "no-regex-spaces": "error",
        "no-return-await": "error",
        "no-throw-literal": "error",
        "no-trailing-spaces": "error",
        "no-underscore-dangle": [
            "off"
        ],
        "no-unused-expressions": [
            "error",
            {
                "allowTaggedTemplates": true,
                "allowShortCircuit": true
            }
        ],
        "no-unused-labels": "error",
        "no-var": "error",
        // "one-var": "error",
        "radix": "error",
        "space-before-function-paren": [
            "error",
            {
                "anonymous": "always",
                "named": "never",
                "asyncArrow": "always"
            }
        ],
        "use-isnan": "error",
        "@typescript-eslint/tslint/config": [
            "error",
            {
                "rulesDirectory": [
                    "/Users/zhongheng/workspace/lab/webpack-cdn-upload-plugin/node_modules/tslint-eslint-rules/dist/rules"
                ],
                "rules": {
                    "block-spacing": [
                        true,
                        "always"
                    ],
                    "brace-style": [
                        true,
                        "1tbs",
                        {
                            "allowSingleLine": true
                        }
                    ],
                    "comment-format": [
                        true,
                        "check-space"
                    ],
                    "deprecation": true,
                    "handle-callback-err": [
                        true,
                        "^(err|error)$"
                    ],
                    "jsdoc-format": true,
                    "no-duplicate-case": true,
                    "no-empty-character-class": true,
                    "no-ex-assign": true,
                    "no-extra-boolean-cast": true,
                    "no-inner-declarations": [
                        true,
                        "functions"
                    ],
                    "no-multi-spaces": true,
                    "no-reference-import": true,
                    "no-unexpected-multiline": true,
                    "no-unused-variable": true,
                    "object-curly-spacing": [
                        true,
                        "always"
                    ],
                    "one-line": [
                        true,
                        "check-catch",
                        "check-finally",
                        "check-else",
                        "check-open-brace",
                        "check-whitespace"
                    ],
                    "strict-type-predicates": true,
                    "ter-arrow-spacing": [
                        true,
                        {
                            "before": true,
                            "after": true
                        }
                    ],
                    "ter-func-call-spacing": [
                        true,
                        "never"
                    ],
                    "ter-indent": [
                        true,
                        2,
                        {
                            "SwitchCase": 1
                        }
                    ],
                    "ter-no-irregular-whitespace": true,
                    "ter-no-sparse-arrays": true,
                    "trailing-comma": true,
                    "valid-typeof": true,
                    "whitespace": [
                        true,
                        "check-branch",
                        "check-decl",
                        "check-operator",
                        "check-rest-spread",
                        "check-type",
                        "check-typecast",
                        "check-type-operator",
                        "check-preblock"
                    ]
                }
            }
        ]
    },
    "globals": {},
    "parser": "@typescript-eslint/parser",
    "parserOptions": {
        "project": "tsconfig.json",
        "sourceType": "module"
    },
    "plugins": [
        "@typescript-eslint",
        "@typescript-eslint/tslint"
    ],
    "settings": {
        "jsdoc": {
            "tagNamePreference": {
                "returns": "return"
            }
        }
    }
};
