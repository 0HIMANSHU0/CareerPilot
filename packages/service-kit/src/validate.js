// validate({ body, query, params }) parses with Zod and replaces the request values with parsed data.
function validate(schemas) {
  return (req, res, next) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      // Express 5 exposes req.query as a getter, so redefine it with the parsed value.
      if (schemas.query) Object.defineProperty(req, 'query', { value: schemas.query.parse(req.query), writable: true });
      if (schemas.params) req.params = schemas.params.parse(req.params);
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { validate };
