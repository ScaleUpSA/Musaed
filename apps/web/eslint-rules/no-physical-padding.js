const physicalPadding = /\b(?:pl|pr)-[^\s'"]+/g;

function checkNode(context, node, value) {
    const match = value.match(physicalPadding);

    if (match) {
        context.report({
            node,
            message: `Use logical padding utilities instead of ${match[0]}.`,
        });
    }
}

export default {
    rules: {
        'no-physical-padding': {
            meta: {
                type: 'problem',
                docs: {
                    description: 'Disallow physical Tailwind padding utilities.',
                },
                schema: [],
            },
            create(context) {
                return {
                    Literal(node) {
                        if (typeof node.value === 'string') {
                            checkNode(context, node, node.value);
                        }
                    },
                    TemplateLiteral(node) {
                        for (const quasi of node.quasis) {
                            checkNode(context, quasi, quasi.value.raw);
                        }
                    },
                };
            },
        },
    },
};
