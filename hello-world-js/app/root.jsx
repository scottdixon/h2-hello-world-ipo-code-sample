import {defer} from '@shopify/remix-oxygen';
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from '@remix-run/react';

import {ShopifyProvider} from '@shopify/storefront-kit-react';

import {Layout} from '~/components';
import styles from './styles/app.css';
import favicon from '../public/favicon.svg';

const shopifyConfig = {
  storefrontToken: '3b580e70970c4528da70c98e097c2fa0',
  storeDomain: 'https://hydrogen-preview.myshopify.com',
  storefrontApiVersion: '2023-01',
  locale: 'en',
};

export const links = () => {
  return [
    {rel: 'stylesheet', href: styles},
    {
      rel: 'preconnect',
      href: 'https://cdn.shopify.com',
    },
    {
      rel: 'preconnect',
      href: 'https://shop.app',
    },
    {rel: 'icon', type: 'image/svg+xml', href: favicon},
  ];
};

export const meta = (data) => ({
  charset: 'utf-8',
  viewport: 'width=device-width,initial-scale=1',
});

export async function loader({context, request}) {
  const cartId = await context.session.get('cartId');

  const [cart, layout] = await Promise.all([
    cartId
      ? (
          await context.storefront.query(CART_QUERY, {
            variables: {
              cartId,
              /**
      Country and language properties are automatically injected
      into all queries. Passing them is unnecessary unless you
      want to override them from the following default:
      */
              country: context.storefront.i18n.country,
              language: context.storefront.i18n.language,
            },
            cache: context.storefront.CacheNone(),
          })
        ).cart
      : null,
    await context.storefront.query(LAYOUT_QUERY),
  ]);

  return defer({
    cart,
    layout,
  });
}

export default function App() {
  const data = useLoaderData();
  const {name, description} = data.layout.shop;

  return (
    <ShopifyProvider shopifyConfig={shopifyConfig}>
      <html lang="en">
        <head>
          <Meta />
          <Links />
        </head>
        <body>
          <Layout description={description} title={name}>
            <Outlet />
          </Layout>
          <ScrollRestoration />
          <Scripts />
        </body>
      </html>
    </ShopifyProvider>
  );
}

const CART_QUERY = `#graphql
  query CartQuery($cartId: ID!) {
    cart(id: $cartId) {
      ...CartFragment
    }
  }

  fragment CartFragment on Cart {
    id
    checkoutUrl
    totalQuantity
    buyerIdentity {
      countryCode
      customer {
        id
        email
        firstName
        lastName
        displayName
      }
      email
      phone
    }
    lines(first: 100) {
      edges {
        node {
          id
          quantity
          attributes {
            key
            value
          }
          cost {
            totalAmount {
              amount
              currencyCode
            }
            amountPerQuantity {
              amount
              currencyCode
            }
            compareAtAmountPerQuantity {
              amount
              currencyCode
            }
          }
          merchandise {
            ... on ProductVariant {
              id
              availableForSale
              compareAtPrice {
                ...MoneyFragment
              }
              price {
                ...MoneyFragment
              }
              requiresShipping
              title
              image {
                ...ImageFragment
              }
              product {
                handle
                title
                id
              }
              selectedOptions {
                name
                value
              }
            }
          }
        }
      }
    }
    cost {
      subtotalAmount {
        ...MoneyFragment
      }
      totalAmount {
        ...MoneyFragment
      }
      totalDutyAmount {
        ...MoneyFragment
      }
      totalTaxAmount {
        ...MoneyFragment
      }
    }
    note
    attributes {
      key
      value
    }
    discountCodes {
      code
    }
  }

  fragment MoneyFragment on MoneyV2 {
    currencyCode
    amount
  }

  fragment ImageFragment on Image {
    id
    url
    altText
    width
    height
  }
`;

const LAYOUT_QUERY = `#graphql
  query layout {
    shop {
      name
      description
    }
  }
`;
