import { generateCartToken, getMappedIncludes } from './utils';
import { JsonApiErrors } from './jsonapi_errors';
import { stringify } from 'qs';

/**
 * Options for HttpClient.
 *
 * @todo see https://github.com/octokit/request.js/blob/master/src/fetch-wrapper.ts
 */

export class HttpClient {
  apiUrl: string;
  cartToken: string;
  storeId?: string;
  authorization?: string;
  constructor(apiUrl: string, apiPrefix: string, cartToken?: string, storeId?: string, authorization?: string) {
    // remove any trailing slashes.
    apiUrl = apiUrl.replace(/\/$/, '');
    if (apiPrefix.substring(0, 1) !== '/') {
      throw new Error('apiPrefix must begin with "/"');
    }
    this.apiUrl = `${apiUrl}${apiPrefix}`;
    // ensure a cart token.
    this.cartToken = cartToken || generateCartToken();
    this.storeId = storeId;
    this.authorization = authorization;
  }

  /**
   * Get the API entrypoint.
   */
  public async getEntrypoint(): Promise<TopLevelDocument> {
    return await this.request(`/`);
  }

  public async getCart(
    fields?: RequestFields,
    includes: string[] = ['order_items', 'order_items.purchased_entity'],
  ): Promise<{ cart: ResourceObject; included: any }> {
    const json = await this.request(`/carts`, { fields, includes });
    const data = json?.data;
    const included = json?.included;
    if (!data) {
      // should never happen.
      throw new Error('unexpected data format');
    }
    if (Array.isArray(data)) {
      return { cart: data[0], included };
    } else {
      return { cart: data, included };
    }
  }

  public async addToCart(
    purchasableEntity: ResourceIdentifier,
    orderQuantity: number,
    fields?: RequestFields,
    includes: string[] = ['order_id', 'order_id.order_items', 'order_id.order_items.purchased_entity'],
  ): Promise<{ cartItem: ResourceObject; cart: ResourceObject; included: any }> {
    const json = await this.request(
      `/cart/add`,
      { fields, includes },
      {
        method: 'POST',
        body: JSON.stringify({
          data: [
            {
              type: purchasableEntity.type,
              id: purchasableEntity.id,
              meta: {
                orderQuantity,
              },
            },
          ],
        }),
      },
    );
    const { data, included } = json;
    if (!data) {
      // should never happen.
      throw new Error('unexpected data format');
    }
    let cartItem: ResourceObject;
    cartItem = Array.isArray(data) ? data[0] : data;
    const mappedIncludes = getMappedIncludes(json.included);
    const cartRelationship = cartItem.relationships.order_id.data;
    const cart = mappedIncludes[cartRelationship.type][cartRelationship.id];

    return {
      cartItem,
      cart,
      included,
    };
  }

  public async updateCartItem(
    cartItem: ResourceObject,
    quantity: number,
    fields?: RequestFields,
    includes: string[] = ['order_id', 'order_id.order_items', 'order_id.order_items.purchased_entity'],
  ) {
    // `/jsonapi/carts/${parameters.cartId}/items/${parameters.orderItemId}`
    // PATCH
    const cartId = cartItem.relationships.order_id.data.id;
    const json = await this.request(
      `/carts/${cartId}/items/${cartItem.id}`,
      { fields, includes },
      {
        method: 'PATCH',
        body: JSON.stringify({
          data: {
            type: cartItem.type,
            id: cartItem.id,
            attributes: {
              quantity,
            },
          },
        }),
      },
    );
    const data = json?.data;
    const included = json?.included;
    if (!data) {
      throw new Error('unexpected data format');
    }

    let patchedCartItem;
    if (Array.isArray(data)) {
      patchedCartItem = data[0];
    } else {
      patchedCartItem = data;
    }

    const mappedIncludes = getMappedIncludes(json.included);
    const cartRelationship = patchedCartItem.relationships.order_id.data;
    const cart = mappedIncludes[cartRelationship.type][cartRelationship.id];

    return {
      cartItem: patchedCartItem,
      cart,
      included,
    };
  }

  public async removeCartItem(cartItem: ResourceObject) {
    // `/jsonapi/carts/${parameters.cartId}/items`
    // DELETE
    const cartId = cartItem.relationships.order_id.data.id;
    await this.request(`/carts/${cartId}/items`, undefined, {
      method: 'DELETE',
      body: JSON.stringify({
        data: [
          {
            type: cartItem.type,
            id: cartItem.id,
          },
        ],
      }),
    });
  }

  public async applyPromotionalCode(cart: ResourceIdentifier, promotionalCode: string) {
    // `/jsonapi/carts/${parameters.cartId}/coupons`
    // POST
    // @todo allow adding include
    await this.request(`/carts/${cart.id}/coupons`, undefined, {
      method: 'PATCH',
      body: JSON.stringify({
        data: [
          {
            type: 'promotion-coupon',
            id: promotionalCode,
          },
        ],
      }),
    });
  }

  public async getCheckout(
    cart: ResourceIdentifier,
    fields?: RequestFields,
    includes: string[] = ['order_items', 'order_items.purchased_entity'],
  ) {
    const json = await this.request(`/checkout/${cart.id}`, {
      includes,
      fields,
    });
    const data = json?.data;
    const included = json?.included;
    if (!data) {
      throw new Error('unexpected data format');
    }
    return { cart: data, included };
  }

  public async patchCheckout(
    cart: ResourceIdentifier,
    attributes?: any,
    fields?: RequestFields,
    includes: string[] = ['order_items', 'order_items.purchased_entity'],
  ) {
    const json = await this.request(
      `/checkout/${cart.id}`,
      { includes, fields },
      {
        method: 'PATCH',
        body: JSON.stringify({
          data: {
            type: cart.type,
            id: cart.id,
            attributes,
          },
        }),
      },
    );
    const data = json?.data;
    const included = json?.included;
    if (!data) {
      throw new Error('unexpected data format');
    }
    return { cart: data, included };
  }

  protected requestOptionsToQuery(options?: RequestOptions): string {
    if (!options) {
      return '';
    }
    const query: {
      include?: string;
      fields?: { [key: string]: string };
      filter?: { [key: string]: string };
      sort?: string;
      page?: {
        limit: number;
        offset: number;
      };
    } = {};
    if (options.includes) {
      query.include = options.includes.join(',');
    }
    if (options.fields) {
      query.fields = {};
      for (const key in options.fields) {
        if (options.fields.hasOwnProperty(key)) {
          query.fields[key] = options.fields[key].join(',');
        }
      }
    }
    if (options.filter) {
      query.filter = {};
      for (const key in options.filter) {
        if (options.filter.hasOwnProperty(key)) {
          query.filter[key] = options.filter[key];
        }
      }
    }
    if (options.sort) {
      query.sort = options.sort.join(',');
    }
    if (options.page) {
      query.page = options.page;
    }
    return `?` + stringify(query);
  }

  /**
   * Perform a request against the API.
   *
   * @param input path
   * @param options
   * @param init options
   */
  public async request(input: RequestInfo, options?: RequestOptions, init?: RequestInit): Promise<TopLevelDocument> {
    const queryString = this.requestOptionsToQuery(options);
    const requestUrl = `${this.apiUrl}${input}${queryString}`;

    const request = new Request(requestUrl, init);
    request.headers.set('Accept', 'application/vnd.api+json');
    request.headers.set('Commerce-Cart-Token', this.cartToken);
    if (this.storeId) {
      request.headers.set('Commerce-Current-Store', this.storeId);
    }
    if (this.authorization) {
      request.headers.set('Authorization', this.authorization);
    }
    if (init && init.method && ['POST', 'PATCH', 'DELETE'].includes(init.method)) {
      request.headers.set('Content-Type', 'application/vnd.api+json');
    }

    let res: Response;
    let json: TopLevelDocument;
    try {
      res = await fetch(request);
    } catch (error) {
      // handle a rejected fetch promise, usually caused by network errors.
      throw new JsonApiErrors([
        {
          code: '000',
          title: error.message,
        },
      ]);
    }

    // @todo in reality it is a null return value.
    if (res.status === 204) {
      return {};
    }

    // throw an error if we did not receive JSON:API
    if (res.headers.get('Content-Type') !== 'application/vnd.api+json') {
      throw new JsonApiErrors([
        {
          code: '000',
          status: res.status.toString(),
          title: 'response did not return JSON:API',
        },
      ]);
    }
    json = await res.json();
    if (res.ok) {
      return json;
    } else if (json.errors) {
      throw JsonApiErrors.fromResponse(json);
    } else {
      throw new JsonApiErrors([
        {
          code: '000',
          title: 'unknown error',
        },
      ]);
    }
  }
}
