///////////////////////////////////////////////////////////////////
//QUERY SETUP//////////////////////////////////////////////////////

// INITIALIZE KEEN
var client = new Keen({
  projectId: "540a24ab36bca41fa980505c",
  readKey: "7d266edfa93c5aa9391ab5749c8e0ba3a08f9e1f9e74794b9808209116fca4ed3cadadfad235102244cae3e76d1101608d46c81513af814c98ed17f044b14daee38f1a7e5a69baf7f34ed4c42c7c0a2195ffcc25f2f5a8723ad0b24a69ab5e7be973d607c5cdbaeee6f5e25cc3cc0325"
});

// CAPTURE USER DATA
var userInputs = {
  timeframe: getSpecialDay(document.getElementById("timeframe").options[document.getElementById("timeframe").selectedIndex].value),
  start: document.getElementById("startLoc").options[document.getElementById("startLoc").selectedIndex].value,
  end: document.getElementById("endLoc").options[document.getElementById("endLoc").selectedIndex].value,
  product: document.getElementById("product").options[document.getElementById("product").selectedIndex].value
};

var graphsContainerHeight = window.innerHeight - document.getElementById('header').offsetHeight;
document.getElementById('graph-left').setAttribute("style","height:" + (graphsContainerHeight - 80) + "px")
document.getElementById('graph-right-top').setAttribute("style","height: 70px")
document.getElementById('graph-right-bottom').setAttribute("style","height:" + (graphsContainerHeight - 192) + "px")


///////////////////////////////////////////////////////////////////
//SETUP LEFT GRAPH VARIABLES //////////////////////////////////////
var leftTopPad = 15;
var leftBottomPad = 25;

var graphLeftWidth = document.getElementById('graph-left').offsetWidth;
var graphLeftHeight = document.getElementById('graph-left').offsetHeight - leftTopPad - leftBottomPad;

var graphLeftBarHeight = 12;
var graphLeftBarWidth = graphLeftWidth / 2 - 2 * 36;

var colorIntensities = 
['rgb(255,247,236)','rgb(254,232,200)','rgb(253,212,158)','rgb(253,187,132)','rgb(252,141,89)','rgb(239,101,72)','rgb(215,48,31)','rgb(179,0,0)','rgb(127,0,0)']
.reverse();

// CREATE CANVAS
var graphLeftSVG = d3.select("#graph-left").append("svg")
  .attr("width", graphLeftWidth)
  .attr("height", document.getElementById('graph-left').offsetHeight)
  .attr("id", "graph-left-content");

// ESTABLISH SCALES
var graphLeftXScale = d3.scale.linear().range([0, graphLeftWidth]);
var graphLeftYScale = d3.scale.linear().range([leftTopPad, graphLeftHeight - leftTopPad - leftBottomPad]).domain([0, 23]);
var graphLeftIntensityScale = d3.scale.quantile().range(colorIntensities);
var elementSizeScale = d3.scale.ordinal().range([10,12,14]).domain([1280, 400]);

// APPEND TIME LABELS
graphLeftSVG.append("g").attr("class", "timetext").attr("fill","white").style("text-anchor","middle")
  .selectAll(".hours").data(new Array(24))
  .enter().append("text").attr("class","hours")
  .attr("hour", function(d, i){
    return i;
  })
  .text(formatTime)
  .attr("x", function(){
    if (graphLeftHeight < 400){
      return graphLeftWidth / 2 - 10 / 2;
    }
    return graphLeftWidth / 2 - 12 / 2;
  })
  .attr("y",function(d,i){ return graphLeftYScale(i) + leftTopPad; })
  .style("font-size", function(){ if (graphLeftHeight < 400) return 10; return 12; })
  .attr("opacity",0)
  .on("mouseover", function(){
    var thisNode = d3.select(this);
    var hour = thisNode.attr("hour");
    thisNode.attr("fill", "RGBA(241, 82, 130, 1)");
    d3.selectAll(".besttimes--time.hour" + hour)
      .style("fill", "RGBA(241, 82, 130, 1)")
    d3.selectAll(".besttimes--hour.hour" + hour)
      .style("fill", "RGBA(241, 82, 130, 1)")
    d3.selectAll(".surgetrends--dot.hour" + hour)
      .style("fill", "none")
      .style("stroke", function(d, i){
        if ( this.classList.contains("MTWTF") ) return "RGBA(173, 221, 237, 1)";
        if ( this.classList.contains("SS") ) return "RGBA(33, 188, 215, 1)";
      })
      .style("stroke-width", 1.5)
      .attr("r", 5)
    d3.selectAll(".minfare--label.hour" + hour)
      .style("fill", "RGBA(241, 82, 130, 1)")
    d3.selectAll(".maxfare--label.hour" + hour)
      .style("fill", "RGBA(241, 82, 130, 1)")
  })
  .on("mouseout", function(){
    var thisNode = d3.select(this);
    var hour = thisNode.attr("hour");
    thisNode.attr("fill", "white");
    d3.selectAll(".besttimes--time.hour" + hour)
      .style("fill", "white")
    d3.selectAll(".besttimes--hour.hour" + hour)
      .style("fill", "white")
    d3.selectAll(".surgetrends--dot.hour" + hour)
      .style("fill", function(d, i){
        if ( this.classList.contains("MTWTF") ) return "RGBA(173, 221, 237, 1)";
        if ( this.classList.contains("SS") ) return "RGBA(33, 188, 215, 1)";
      })
      .style("stroke", "none")
      .attr("r", function(){
        if ( this.classList.contains("maxsurge") ) return 8;
        return 2;
      })
    d3.selectAll(".minfare--label.hour" + hour)
      .style("fill", "none")
    d3.selectAll(".maxfare--label.hour" + hour)
      .style("fill", "white")
  })
  .transition().duration(1000).delay(function(d,i){ return i * 100; })
  .attr("opacity",1);

// APPEND LEGEND
  var legendContainer = graphLeftSVG.append("g").attr("class", "legend").attr("fill", "white");
  graphLeftIntensityScale.domain([0,6])
  legendContainer.selectAll("rect").data(d3.range(9).map(function(a,i){ return i;})).enter().append("rect")
    .attr("width", 6)
    .attr("height", 4)
    .attr("y", function(d,i){
      return graphLeftHeight + leftTopPad - i * 5 + 15;
    })
    .attr("x", 10)
    .style("fill", graphLeftIntensityScale)

  legendContainer.selectAll(".datText").data(d3.range(9).map(function(a,i){ if ( i === 0 ){ return "High Surge"; } else{return "Low Surge";} }))
    .enter().append("text")
    .text(function(d,i){
      // return d
      if (i === 0 || i === 8) return d;
    })
    .attr("y", function(d,i){
      return graphLeftHeight + leftTopPad - i * 4.25 + 17;
    })
    .attr("x", 22)
    .style("fill", "white")
    .style("font-size", "10px")

///////////////////////////////////////////////////////////////////
//SETUP TOP RIGHT GRAPH VARIABLES /////////////////////////////////
var graphRightTopWidth = document.getElementById('graph-right-top').offsetWidth;
var graphRightTopHeight = document.getElementById('graph-right-top').offsetHeight;

// CREATE CANVAS
var graphRightTopSVG = d3.select("#graph-right-top").append("svg")
  .attr("width", graphRightTopWidth)
  .attr("height", graphRightTopHeight)
  .attr("id", "graph-right-top-content");

///////////////////////////////////////////////////////////////////
//SETUP BOTTOM RIGHT GRAPH VARIABLES //////////////////////////////
var rightBottomTopPad = 10;
var rightBottomBottomPad = 10;
var rightBottomLeftPad = 50;
var rightBottomRightPad = 20;

var graphRightBottomWidth = document.getElementById('graph-right-bottom').offsetWidth;
var graphRightBottomHeight = document.getElementById('graph-right-bottom').offsetHeight - rightBottomTopPad - rightBottomBottomPad;

// CREATE CANVAS
var graphRightBottomSVG = d3.select("#graph-right-bottom").append("svg")
  .attr("width", graphRightBottomWidth)
  .attr("height", document.getElementById('graph-right-bottom').offsetHeight)
  .append("g")
    .attr("transform","translate(" + rightBottomLeftPad + "," + rightBottomTopPad + ")")
    .attr("id", "graph-right-bottom-content");

// ESTABLISH SCALES
var graphRightBottomXScale = d3.scale.linear().range([0, graphRightBottomWidth - rightBottomRightPad - rightBottomLeftPad]).domain([0, 23]);
var graphRightBottomYScale = d3.scale.linear().range([rightBottomTopPad, graphRightBottomHeight - rightBottomTopPad - rightBottomBottomPad]);

//  ESTABLISH LINE PATH
var graphRightBottomLine = d3.svg.line().interpolate("monotone")
  .x(function(d){ return graphRightBottomXScale(d.hour); })

///////////////////////////////////////////////////////////////////
//INITIAL RENDER///////////////////////////////////////////////////
Keen.ready(function(){ 
  getDataandFirstRender(userInputs);
});

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
    } else if ( !sameCities(newStart, newEnd) ){
      document.getElementById('options')
        .appendChild(document.createTextNode('Let\'s not try to Uber across the country, we both know you cannot afford it.'));
      alertInDOM = true;
      return;
    } else {
      alertInDOM = false;
    }

    var userInputs = {
      timeframe: getSpecialDay(document.getElementById("timeframe").options[document.getElementById("timeframe").selectedIndex].value),
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
  var maxSurge = 0;
  var maxAvgSurge = 0;
  var maxAvgFare = 0;
  var bestTimesMTWTF = [];
  var bestTimesSS = [];
  var originalSortedData = {};

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
    if (estimate.value !== null){
      var timestamp = new Date(estimate.timeframe.start);
      var day = timestamp.getDay();
      var hour = timestamp.getHours();
      if ( day === 1 ||  day === 2 || day === 3 || day === 4 || day === 5 ){
        result.MTWTF.maxFare[hour].push(estimate.value);
      } else {
        result.SS.maxFare[hour].push(estimate.value);
      }
    }
  });

  lowEstimate.forEach(function(estimate){
    if (estimate.value !== null){
      var timestamp = new Date(estimate.timeframe.start);
      var day = timestamp.getDay();
      var hour = timestamp.getHours();
      if ( day === 1 ||  day === 2 || day === 3 || day === 4 || day === 5 ){
        result.MTWTF.minFare[hour].push(estimate.value);
      } else {
        result.SS.minFare[hour].push(estimate.value);
      }
    }
  });

  surgeEstimate.forEach(function(estimate){
    if (estimate.value !== null){
      var timestamp = new Date(estimate.timeframe.start);
      var day = timestamp.getDay();
      var hour = timestamp.getHours();
      if ( day === 1 ||  day === 2 || day === 3 || day === 4 || day === 5 ){
        result.MTWTF.surge[hour].push(estimate.value);
      } else {
        result.SS.surge[hour].push(estimate.value);
      }
    }
  });
  Object.keys(result).forEach(function(daySegment){
    var minCost = Infinity;
    var bestHours = [];
    originalSortedData[daySegment] = {};
    Object.keys(result[daySegment]).forEach(function(dataType){
      originalSortedData[daySegment][dataType] = [];
      result[daySegment][dataType] = result[daySegment][dataType].map(function(collection, hour){
        collection.forEach(function(value){
          if (dataType === 'surge' && value > maxSurge) maxSurge = value;
          originalSortedData[daySegment][dataType].push([hour, value])
        })
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
        if (dataType === 'surge') return {hour:hour, surge: mean};
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
  result['originalSortedData'] = originalSortedData;
  result['maxSurge'] = maxSurge;
  return result;
}

function sameCities(start, end){
  // SF LOCATIONS
  // 37.7833° N, 122.4167° W
  if ( start === "gogp" && end === "pwll" || start === "gogp" && end === "warf" ) return "SF";
  if ( start === "pwll" && end === "gogp" || start === "pwll" && end === "warf" ) return "SF";
  if ( start === "warf" && end === "pwll" || start === "warf" && end === "gogp" ) return "SF";

  // LA LOCATIONS
  // 34.0500° N, 118.2500° W
  if ( start === "dtla" && end === "smon" || start === "dtla" && end === "hlwd" ) return "LA";
  if ( start === "smon" && end === "dtla" || start === "smon" && end === "hlwd" ) return "LA";
  if ( start === "hlwd" && end === "smon" || start === "hlwd" && end === "dtla" ) return "LA";

  // NY LOCATIONS
  // 40.7127° N, 74.0059° W
  if ( start === "grct" && end === "upma" || start === "grct" && end === "brok" ) return "NY";
  if ( start === "upma" && end === "grct" || start === "upma" && end === "brok" ) return "NY";
  if ( start === "brok" && end === "upma" || start === "brok" && end === "grct" ) return "NY";

  return false;
}

function formatTime(d,i){
  if ( i === 0 ) return '12a'
  if ( i === 12 ) return i + 'p';
  if ( i > 12 ) return i - 12 + 'p';
  return i + 'a';
}

function getSpecialDay(input){
  if ( input === 'halloween'){
    return {
      "start" : "2014-10-27T00:00:00.000Z",
      "end" : "2014-11-03T00:00:00.000Z"
    };
  } else if ( input === 'thanksgiving'){
    return {
      "start" : "2014-11-24T00:00:00.000Z",
      "end" : "2014-12-01T00:00:00.000Z"
    };
  }
  return input;
}

function getSunriseSunset(date){
  if ( typeof date === 'string'){
    console.log("string date", date)
    var date = new Date();
    if (date ==="this_7_days")
    if (date ==="this_14_days")
    if (date ==="this_21_days")
    if (date ==="this_28_days")
    if (date ==="this_60_days")
  } else {
    console.log("else date", date.start)
    if (date ==="thanksgiving")
    if (date ==="halloween")
  }
}
