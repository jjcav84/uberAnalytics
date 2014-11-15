///////////////////////////////////////////////////////////////////
//GATHER DATA AND PERFORM FIRST RENDER/////////////////////////////
function getDataandFirstRender(userInputs){
  // SETUP QUERIES
  var highEstimateQuery = new Keen.Query("average", {
    eventCollection: "newPricesCollection",
    timeframe: userInputs.timeframe,
    targetProperty: "high_estimate",
    interval: "hourly",
    filters: [{"property_name":"end","operator":"eq","property_value":userInputs.end},
              {"property_name":"start","operator":"eq","property_value":userInputs.start},
              {"property_name":"display_name","operator":"eq","property_value":userInputs.product}]
  });

  var lowEstimateQuery = new Keen.Query("average", {
    eventCollection: "newPricesCollection",
    timeframe: userInputs.timeframe,
    targetProperty: "low_estimate",
    interval: "hourly",
    filters: [{"property_name":"end","operator":"eq","property_value":userInputs.end},
              {"property_name":"start","operator":"eq","property_value":userInputs.start},
              {"property_name":"display_name","operator":"eq","property_value":userInputs.product}]
  });

  var surgeEstimateQuery = new Keen.Query("average", {
    eventCollection: "newPricesCollection",
    timeframe: userInputs.timeframe,
    targetProperty: "surge_multiplier",
    interval: "hourly",
    filters: [{"property_name":"end","operator":"eq","property_value":userInputs.end},
              {"property_name":"start","operator":"eq","property_value":userInputs.start},
              {"property_name":"display_name","operator":"eq","property_value":userInputs.product}]
  });

  // RUN QUERIES
  console.log('Retrieving data from server.');
  client.run([highEstimateQuery, lowEstimateQuery, surgeEstimateQuery], function(response){
    console.log('Retrieved data from server!');
    var dataCollection = formatData(response[0].result, response[1].result, response[2].result);
    var maxAvgSurge = dataCollection.maxAvgSurge;
    var maxAvgFare = dataCollection.maxAvgFare;
    var bestTimesMTWTF = dataCollection.bestTimesMTWTF;
    var bestTimesSS = dataCollection.bestTimesSS;

    xScale.domain([0, maxAvgFare]);
    surgeIntensityScale.domain([1, maxAvgSurge]);

    // DRAW VIEW FOR EACH SET OF DATA
    Object.keys(dataCollection).forEach(function(collection){
      if ( typeof dataCollection[collection] === 'object' && !Array.isArray(dataCollection[collection]) ){
        // SURGE INTENSITIES  
        svg.append("g").attr("class", "surgeintensities--" + collection )
        .selectAll(".surgeintensity").data(dataCollection[collection].surge)
        .enter().append("rect").attr("class", "surgeintensity--" + collection)
        .attr("width", 6)
        .attr("height", barHeight)
        .attr("x", function(){
          var shift = collection === 'MTWTF' ? -36 : 18;
          return graphLeftWidth / 2 + shift;
        })
        .attr("y",function(d,i){ return yScale(i) + topPad - barHeight; })
        .attr("fill", function(d){ return surgeIntensityScale(d); })
        .attr("stroke-width",1)
        .attr("stroke", function(d){ return surgeIntensityScale(d); })
        .attr("opacity",0)
        .transition().duration(800).delay(function(d,i){ return i * 100; })
        .attr("opacity",1);

        // FARE BARS
        svg.append("g").attr("class", "minfares--" + collection )
          .selectAll(".maxfare").data(dataCollection[collection].minFare)
          .enter().append("rect").attr("class", "minfare--" + collection)
          .attr("width", function(d,i){ return barWidth * (d / maxAvgFare); })
          .attr("height", barHeight)
          .attr("x", function(d){
            var shiftAmount = collection === 'MTWTF' ? - barWidth*(d/maxAvgFare) -36 - 10 : 18 + 10;
            return graphLeftWidth / 2 + shiftAmount;
          })
          .attr("y",function(d,i){ return yScale(i) + topPad - barHeight; })
          .attr("fill", "RGBA(0,0,0,0)")
          .attr("stroke-width",1)
          .attr("stroke", function(d,i){
            if (collection === 'MTWTF' && d > dataCollection.SS.minFare[i]){
              return "RGBA(239, 72, 119, 1)";
            } else if (collection === 'SS' && d > dataCollection.MTWTF.minFare[i]){
              return "RGBA(239, 72, 119, 1)";
            }
            return "grey";
          })
          .attr("opacity",0).transition().duration(800).delay(function(d,i){ return i * 100; }).attr("opacity",1)

        svg.append("g").attr("class", "maxfares--" + collection)
          .selectAll(".maxfare").data(dataCollection[collection].maxFare)
          .enter().append("rect").attr("class","maxfare--" + collection)
          .attr("width", function(d,i){ return barWidth * (d / maxAvgFare); })
          .attr("height", barHeight)
          .attr("x", function(d){
            var shiftAmount = collection === 'MTWTF' ? - barWidth*(d/maxAvgFare) -36 - 10 : 18 + 10;
            return graphLeftWidth / 2 + shiftAmount;
          })
          .attr("y",function(d,i){ return yScale(i) + topPad - barHeight; })
          .attr("fill", "RGBA(0,0,0,0)")
          .attr("stroke-width",1)
          .attr("stroke", function(d,i){
            if (collection === 'MTWTF' && d > dataCollection.SS.maxFare[i]){
              return "RGBA(239, 72, 119, 1)";
            } else if (collection === 'SS' && d > dataCollection.MTWTF.maxFare[i]){
              return "RGBA(239, 72, 119, 1)";
            }
            return "grey";
          })
          .attr("mouseenter", "none")
          .attr("opacity",0).transition().duration(800).delay(function(d,i){ return i * 100; }).attr("opacity",1)
          .each("end", growBars)
      }
    });

    function growBars(){
      var thisNode = d3.select(this);
      var finalWidth = +thisNode.attr("width");
      var finalX = +thisNode.attr("x");

      // assign transistion events
      if ( thisNode.attr("class") === 'maxfare--MTWTF' ){
        thisNode.on("mouseenter", function(d,i){
          var startX = graphLeftWidth / 2 - 36 - 10;
          thisNode.attr("x", startX).attr("width", 0).transition().duration(800)
                  .attr("x", finalX).attr("width", finalWidth);
        });
      } else {
        thisNode.on("mouseenter", function(d,i){
          thisNode.attr("width", 0).transition().duration(800).attr("width", finalWidth);
        });
      }

      // prevent premature termination of transition event
      thisNode.on("mouseout", function(d,i){
        thisNode.transition().duration(800).attr("width", finalWidth).attr("x", finalX);
      });
    }

  });
};