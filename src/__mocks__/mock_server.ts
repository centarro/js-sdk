import fetchMock from 'jest-fetch-mock';
import * as entrypointMock from '../__mocks__/entrypoint.json';
import * as addToCartMock from '../__mocks__/add_to_cart.json';
import * as notFound404 from '../__mocks__/404.json';
import * as getCartMock from '../__mocks__/get_cart.json';

function parseUrl(url: string) {
  const el: HTMLHyperlinkElementUtils = document.createElement('a');
  el.href = url;
  return {
    host: el.host,
    hostname: el.hostname,
    path: el.pathname,
    search: el.search,
  };
}

fetchMock.mockResponse((req) => {
  const accept = req.headers.get('Accept');
  const cartToken = req.headers.get('Commerce-Cart-Token');
  const storeId = req.headers.get('Commerce-Current-Store');
  const urlInfo = parseUrl(req.url);

  return new Promise((resolve, reject) => {
    if (accept !== 'application/vnd.api+json') {
      reject('missing accept header');
      return;
    }
    if (!cartToken) {
      reject('cart token was missing');
      return;
    }

    let body: string | undefined;
    let status: number;
    switch (urlInfo.path) {
      case '/jsonapi/':
        status = 200;
        body = JSON.stringify(entrypointMock);
        break;
      case '/jsonapi/not-found':
        status = 404;
        body = JSON.stringify(notFound404);
        break;
      case '/jsonapi/access-denied':
        resolve({
          status: 401,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
          },
          body: `<html lang="en"></html>`,
        });
        return;
      case '/jsonapi/cart/add':
        if (req.headers.get('Content-Type') !== 'application/vnd.api+json') {
          reject('missing content-type header');
          return;
        }
        if (urlInfo.search !== '?include=order_id%2Corder_id.order_items%2Corder_id.order_items.purchased_entity') {
          reject('missing include');
          return;
        }
        status = 200;
        body = JSON.stringify(addToCartMock);
        break;
      case '/jsonapi/carts':
        if (urlInfo.search !== '?include=order_items%2Corder_items.purchased_entity') {
          reject('missing include');
          return;
        }
        status = 200;
        if (!storeId) {
          body = JSON.stringify(getCartMock);
        } else {
          body = JSON.stringify({
            jsonapi: {
              version: '1.0',
              meta: {
                links: {
                  self: {
                    href: 'http://jsonapi.org/format/1.0/',
                  },
                },
              },
            },
            data: [],
          });
        }
        break;
      default:
        reject('unhandled test case');
        return;
    }

    const response = {
      status,
      headers: {
        'Content-Type': 'application/vnd.api+json',
      },
      body,
    };
    resolve(response);
  });
});

export function setupMockServer() {
  fetchMock.enableMocks();
}
