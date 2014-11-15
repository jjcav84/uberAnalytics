///////////////////////////////////////////////////////////////////
//QUERY SETUP//////////////////////////////////////////////////////

// INITIALIZE KEEN
var client = new Keen({
  projectId: "540a24ab36bca41fa980505c",
  readKey: "7d266edfa93c5aa9391ab5749c8e0ba3a08f9e1f9e74794b9808209116fca4ed3cadadfad235102244cae3e76d1101608d46c81513af814c98ed17f044b14daee38f1a7e5a69baf7f34ed4c42c7c0a2195ffcc25f2f5a8723ad0b24a69ab5e7be973d607c5cdbaeee6f5e25cc3cc0325"
});

// CAPTURE USER DATA
var userInputs = {
  timeframe: document.getElementById("timeframe").options[document.getElementById("timeframe").selectedIndex].value,
  start: document.getElementById("startLoc").options[document.getElementById("startLoc").selectedIndex].value,
  end: document.getElementById("endLoc").options[document.getElementById("endLoc").selectedIndex].value,
  product: document.getElementById("product").options[document.getElementById("product").selectedIndex].value
};

///////////////////////////////////////////////////////////////////
//SETUP PAGE VARIABLES ////////////////////////////////////////////
var topPad = 15;
var bottomPad = 5;

var graphLeftWidth = document.getElementById('graph-left').offsetWidth;
var graphLeftHeight = document.getElementById('graph-left').offsetHeight - topPad - bottomPad;

var barHeight = 12;
var barWidth = graphLeftWidth / 2 - 2 * 36;

// CREATE CANVAS
var svg = d3.select("#graph-left").append("svg")
  .attr("width", graphLeftWidth)
  .attr("height", graphLeftHeight)
  .attr("id", "graph-left-content");

// ESTABLISH SCALES
var xScale = d3.scale.linear().range([0, graphLeftWidth]);
var yScale = d3.scale.linear().range([topPad, graphLeftHeight - topPad - bottomPad]).domain([0, 23]);
var surgeIntensityScale = d3.scale.ordinal().range(['rgb(212,185,218)','rgb(201,148,199)','rgb(223,101,176)','rgb(231,41,138)']);
var elementSizeScale = d3.scale.ordinal().range([10,12,14]).domain([1280, 400]);

// APPEND TIME LABELS
svg.append("g").attr("class", "timetext").attr("fill","white").style("text-anchor","middle")
  .selectAll(".hours").data(new Array(24))
  .enter().append("text").attr("class","hours")
  .text(function(d,i){
    if ( i === 12 ) return i + 'pm';
    if ( i > 12 ) return i - 12 + 'pm';
    return i + 'am';
  })
  .attr("x", function(){
    if (graphLeftHeight < 400){
      return graphLeftWidth / 2 - 10 / 2;
    }
    return graphLeftWidth / 2 - 12 / 2;
  })
  .attr("y",function(d,i){ return yScale(i) + topPad; })
  .style("font-size", function(){ if (graphLeftHeight < 400) return 10; return 12; })
  .attr("opacity",0).transition().duration(1000).delay(function(d,i){ return i * 100; }).attr("opacity",1);

///////////////////////////////////////////////////////////////////
//INITIAL RENDER///////////////////////////////////////////////////
Keen.ready(function(){ getDataandFirstRender(userInputs); });

///////////////////////////////////////////////////////////////////
//RE-INITIALIZE ON INPUT CHANGE////////////////////////////////////
var alertInDOM = false;
d3.select(document.getElementById("options")).on('change',
  function(){
    var newStart = document.getElementById("startLoc").options[document.getElementById("startLoc").selectedIndex].value;
    var newEnd = document.getElementById("endLoc").options[document.getElementById("endLoc").selectedIndex].value;

    if ( alertInDOM ) document.getElementById('options').lastChild.remove();
    if ( newEnd === newStart ){
      document.getElementById('options')
        .appendChild(document.createTextNode('Please choose two different locations in the same city.'));
      alertInDOM = true;
      return;
    } else if ( differentCities(newStart, newEnd) ){
      document.getElementById('options')
        .appendChild(document.createTextNode('Let\'s not try to Uber across the country, we both know you cannot afford it.'));
      alertInDOM = true;
      return;
    } else {
      alertInDOM = false;
    }

    var userInputs = {
      timeframe: document.getElementById("timeframe").options[document.getElementById("timeframe").selectedIndex].value,
      start: newStart,
      end: newEnd,
      product: document.getElementById("product").options[document.getElementById("product").selectedIndex].value
    };

    updateDataandRender(userInputs);
  }
);

///////////////////////////////////////////////////////////////////
//HELPER FUNCTIONS/////////////////////////////////////////////////
function formatData(highEstimate, lowEstimate, surgeEstimate){
  var maxAvgSurge = 0;
  var maxAvgFare = 0;
  var bestTimesMTWTF = [];
  var bestTimesSS = [];

  var result = { 'MTWTF':{}, 'SS':{} };
  Object.keys(result).forEach(function(daySegment){
    result[daySegment]['surge'] = [];
    result[daySegment]['minFare'] = [];
    result[daySegment]['maxFare'] = [];
    for (var i = 0; i < 24; i++){
      result[daySegment]['surge'].push([]);
      result[daySegment]['minFare'].push([]);
      result[daySegment]['maxFare'].push([]);
    }
  });

  highEstimate.forEach(function(estimate){
    var timestamp = new Date(estimate.timeframe.start);
    var day = timestamp.getDay();
    var hour = timestamp.getHours();
    if ( day === 1 ||  day === 2 || day === 3 || day === 4 || day === 5 ){
      result.MTWTF.maxFare[hour].push(estimate.value);
    } else {
      result.SS.maxFare[hour].push(estimate.value);
    }
  });

  lowEstimate.forEach(function(estimate){
    var timestamp = new Date(estimate.timeframe.start);
    var day = timestamp.getDay();
    var hour = timestamp.getHours();
    if ( day === 1 ||  day === 2 || day === 3 || day === 4 || day === 5 ){
      result.MTWTF.minFare[hour].push(estimate.value);
    } else {
      result.SS.minFare[hour].push(estimate.value);
    }
  });

  surgeEstimate.forEach(function(estimate){
    var timestamp = new Date(estimate.timeframe.start);
    var day = timestamp.getDay();
    var hour = timestamp.getHours();
    if ( day === 1 ||  day === 2 || day === 3 || day === 4 || day === 5 ){
      result.MTWTF.surge[hour].push(estimate.value);
    } else {
      result.SS.surge[hour].push(estimate.value);
    }
  });

  Object.keys(result).forEach(function(daySegment){
    var minCost = Infinity;
    var bestHours = [];
    Object.keys(result[daySegment]).forEach(function(dataType){
      result[daySegment][dataType] = result[daySegment][dataType].map(function(collection, hour){
        var mean = d3.mean(collection);
        if ( dataType === 'minFare' ){
          if ( mean < minCost ){
            minCost = mean;
            bestHours = [hour];
          } else if ( mean === minCost ) {
            bestHours.push(hour);
          }
        }
        if ( dataType === 'maxFare' && mean > maxAvgFare ){
          maxAvgFare = mean;
        } else if ( dataType === 'surge' && mean > maxAvgSurge ){
          maxAvgSurge = mean;
        }
        return mean;
      });
    });
    if ( daySegment === 'MTWTF' ) bestTimesMTWTF = bestHours;
    if ( daySegment === 'SS' ) bestTimesSS = bestHours;
  });

  result['maxAvgSurge'] = maxAvgSurge;
  result['maxAvgFare'] = maxAvgFare;
  result['bestTimesMTWTF'] = bestTimesMTWTF;
  result['bestTimesSS'] = bestTimesSS;
console.log(result)
  return result;
}

function differentCities(start, end){
  // SF LOCATIONS
  if ( start === "gogp" && end === "pwll" || start === "gogp" && end === "warf" ) return false;
  if ( start === "pwll" && end === "gogp" || start === "pwll" && end === "warf" ) return false;
  if ( start === "warf" && end === "pwll" || start === "warf" && end === "gogp" ) return false;

  // LA LOCATIONS
  if ( start === "dtla" && end === "smon" || start === "dtla" && end === "hlwd" ) return false;
  if ( start === "smon" && end === "dtla" || start === "smon" && end === "hlwd" ) return false;
  if ( start === "hlwd" && end === "smon" || start === "hlwd" && end === "dtla" ) return false;

  // NY LOCATIONS
  if ( start === "grct" && end === "upma" || start === "grct" && end === "brok" ) return false;
  if ( start === "upma" && end === "grct" || start === "upma" && end === "brok" ) return false;
  if ( start === "brok" && end === "upma" || start === "brok" && end === "grct" ) return false;

  return true;
}
