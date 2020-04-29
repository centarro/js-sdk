export class JsonApiErrors extends Error {
  private readonly _errors: ErrorObject[];
  constructor(errors: ErrorObject[]) {
    super();
    this._errors = errors;
  }
  static fromResponse(document: TopLevelDocument) {
    if (!document.errors) {
      throw new Error('cannot construct without JSON:API error objects');
    }
    return new JsonApiErrors(document.errors);
  }
  public getErrors(): ErrorObject[] {
    return this._errors;
  }
}
