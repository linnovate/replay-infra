module.exports = {

getAllSources : function(req,res){
	Source.find(function foundMidurs(err, sources) {
      if (err) return next(err);

      // pass the array down to the /views/index.ejs page
      res.send(JSON.stringify(sources));
    });
}

};
