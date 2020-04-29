import { JsonApiErrors } from '../jsonapi_errors';
import * as errorResponse from '../__mocks__/errors.json';

describe('jsonapi response error', () => {
  test('construct', () => {
    const error = new JsonApiErrors([
      {
        code: '123',
        title: 'foo',
        detail: 'bar',
      },
    ]);
    const errors = error.getErrors();
    expect(errors.length).toBe(1);
    expect(errors[0].code).toBe('123');
  });
  test('from response', () => {
    const error = JsonApiErrors.fromResponse(errorResponse);
    const errors = error.getErrors();
    expect(errors.length).toBe(3);
  });
});
