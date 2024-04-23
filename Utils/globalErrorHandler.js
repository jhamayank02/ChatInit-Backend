const globalErrorHandler = (error, req, res)=>{
    res.send("Something went wrong");
}

module.exports = {globalErrorHandler};