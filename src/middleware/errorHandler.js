const errorHandler = (err, req, res, next) => {
    console.error(err.stack);
    res.status(err.statusCode || 500).json({
        message: err.message || 'Something went wrong on the server.',
        error: process.env.NODE_ENV === 'development' ? err : {}
    });
};

export default errorHandler;