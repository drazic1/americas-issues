// Dimensions to encode --> 4: 3 categorical and 1 numerical
// Demographic aspect (categorical): Age, Gender, Race, etc
// Values for demographic aspects (several categorical for each dem aspect): 18-29, Male, Hispanic, etc
// Issues (categorical): Economy, Jobs, Healthcare, etc
// Percentage values (numerical): 12%, 8.7%, etc

const d3 = require("d3");

d3.csv("./data/surveyTransposed.csv", buildParallel);

let dimensions;
const margin = { top: 30, right: 10, bottom: 140, left: 50 };
const width = 550 - margin.left - margin.right;
const height = 600 - margin.top - margin.bottom;

const xScale = d3.scaleBand().range([0, width]);
const yScale = {};
const colorScale = d3
  .scaleOrdinal()
  .range([
    "#263238",
    "#80CBC4",
    "#26A69A",
    "#00695C",
    "#004D40",
    "#42A5F5",
    "#0D47A1",
    "#FFF59D",
    "#FDD835",
    "#FFEA00",
    "#F57F17",
    "#EF9A9A",
    "#F44336",
    "#D32F2F",
    "#B71C1C",
    "#CE93D8",
    "#8E24AA",
    "#4A148C",
    "#FFECB3",
    "#FFD54F",
    "#FFC107",
    "#FFA000",
    "#FF6F00",
    "#BCAAA4",
    "#8D6E63",
    "#5D4037",
    "#3E2723"
  ]);

const line = d3.line();
const axis = d3.axisLeft();

const svg = d3
  .select("#chart-container")
  .append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

function path(d) {
  // delete d.DemCat;
  return line(
    dimensions.map(function(p) {
      return [xScale(p), yScale[p](d[p])];
    })
  );
}

function buildParallel(surveyData) {
  surveyData.map(row => delete row["(Unweighted N)"]);
  const demCategories = surveyData.map(row => row.DemCat);
  dimensions = Object.keys(surveyData[0]).filter(
    d => d !== "DemCat" && d !== "(Unweighted N)" && d !== "Totals"
  );
  dimensions.forEach(dim => {
    yScale[dim] = d3
      .scaleLinear()
      .range([height, 0])
      .domain([0, 50]);
  });

  xScale.domain(dimensions);
  colorScale.domain(demCategories);

  // Add a group element for each dimension.
  const g = svg
    .selectAll(".dimension")
    .data(dimensions)
    .enter()
    .append("g")
    .attr("class", d => {
      return `dimension ${d.split(" ").join("-")}`;
    })
    .attr("transform", d => "translate(" + xScale(d) + ")");

  // add axis and labels
  g
    .append("g")
    .attr("class", "axis")
    .each(function(d) {
      d3.select(this).call(axis.scale(yScale[d]));
    });

  const label = g
    .append("text")
    .style("text-anchor", "end")
    .style("cursor", "pointer")
    .attr("y", 20)
    .text(function(d) {
      return d;
    })
    .attr("font-family", "sans-serif")
    .attr("font-size", "13px")
    .attr("fill", "black")
    .attr("transform", d => "translate(0, " + height + ")rotate(-45)");

  const dataLines = svg
    .append("g")
    .attr("class", "lines")
    .selectAll("path")
    .data(surveyData)
    .enter()
    .append("path")
    .attr("class", d => {
      return `p-line ${d.DemCat.split(" ").join("-")}`;
    })
    .style("stroke", d => {
      return colorScale(d.DemCat);
    })
    .style("stroke-width", "3px")
    .attr("d", path);

  // Add the legends
  // addLegend(demCategories);

  // Interactions
  label.on("click", function(clickedDimension) {
    const dimensionValues = surveyData.map(row =>
      Number(row[clickedDimension])
    );
    yScale[clickedDimension]
      .range([height, 0])
      .domain(d3.extent(dimensionValues));
    rescaleAxis(surveyData);
    d3
      .select(`g.${clickedDimension.split(" ").join("-")}`)
      .select(".axis")
      .call(axis.scale(yScale[clickedDimension]));
  });

  label.on("mouseout", function(clickedDimension) {
    yScale[clickedDimension].range([height, 0]).domain([0, 50]);
    rescaleAxis(surveyData);
    d3
      .select(`g.${clickedDimension.split(" ").join("-")}`)
      .select(".axis")
      .call(axis.scale(yScale[clickedDimension]));
  });

  dataLines.on("mouseover", function(selectedLine) {
    forceHighlight(selectedLine.DemCat);
  });

  dataLines.on("mouseout", selectedLine => {
    // selectedLine.DemCat to inactive
    // select all was-active and change to active, remove inactive
    resetActiveness(selectedLine.DemCat);
    // d3.selectAll(".legend-cell").style("opacity", 1);
    // d3.selectAll(".p-line").style("opacity", 0.3);
  });
}

function rescaleAxis(surveyData) {
  svg.selectAll(".p-line").attr("d", path);
}

function addLegend(demCategories) {
  const legendsGroups = svg
    .selectAll(".legend-cell")
    .data(demCategories)
    .enter()
    .append("g")
    .attr("class", d => {
      return `legend-box ${d.split(" ").join("-")}`;
    })
    .attr(
      "transform",
      (d, i) => `translate(${600 + 105 * (i % 5)},${80 * parseInt(i / 5)})`
    );

  legendsGroups
    .append("rect")
    .style("fill", d => colorScale(d))
    .attr("width", 100)
    .attr("height", 70)
    .attr("x", 0)
    .attr("y", 0);

  legendsGroups
    .append("text")
    .attr("y", 20)
    .text(function(d) {
      return getSubCategory(d);
    })
    .attr("font-family", "sans-serif")
    .attr("font-size", "13px")
    .attr("fill", "white")
    .attr("transform", d => "translate(20, 0)rotate(45)");

  legendsGroups.on("click", function legendCellClicked(dimensionClicked) {
    // if they are all active --> deactivate them and activte clicked one
    // if there are already inactive ones, only siwcth clicked
    // before return, if all inactive --> activate all
    if (d3.selectAll(".inactive").size() === 0) {
      d3.selectAll(".p-line").classed("inactive", true);
      d3.selectAll(".legend-cell").classed("inactive", true);
      toggleActiveness(dimensionClicked);
    } else {
      toggleActiveness(dimensionClicked);
    }
    if (d3.selectAll(".inactive").size() / 2 === demCategories.length) {
      d3.selectAll(".p-line").classed("inactive", false);
      d3.selectAll(".legend-cell").classed("inactive", false);
    }
  });
}

function toggleActiveness(category) {
  // if active --> deactivate
  // else activate
  const pathElement = d3.select(`.p-line.${category.split(" ").join("-")}`);
  const legendElement = d3.select(
    `.legend-cell.${category.split(" ").join("-")}`
  );
  const classes = pathElement.attr("class").split(" ");
  if (classes.indexOf("inactive") !== -1) {
    legendElement.classed("active", true);
    legendElement.classed("inactive", false);
    pathElement.classed("active", true);
    pathElement.classed("inactive", false);
  } else {
    legendElement.classed("active", false);
    legendElement.classed("inactive", true);
    pathElement.classed("active", false);
    pathElement.classed("inactive", true);
  }
}

function forceHighlight(category) {
  const pathElement = d3.select(`.p-line.${category.split(" ").join("-")}`);
  const legendElement = d3.select(
    `.legend-cell.${category.split(" ").join("-")}`
  );
  saveActivenessState();
  d3.selectAll(".p-line").classed("inactive", true);
  d3.selectAll(".legend-cell").classed("inactive", true);
  legendElement.classed("active", true);
  pathElement.classed("active", true);
}

function saveActivenessState() {
  d3.selectAll(".p-line.active").classed("was-active", true);
  d3.selectAll(".p-line.inactive").classed("was-inactive", true);
  d3.selectAll(".legend-cell.active").classed("was-active", true);
  d3.selectAll(".legend-cell.inactive").classed("was-inactive", true);
}

function resetActiveness(category) {
  const pathElement = d3.select(`.p-line.${category.split(" ").join("-")}`);
  const legendElement = d3.select(
    `.legend-cell.${category.split(" ").join("-")}`
  );
  legendElement.classed("active", false);
  pathElement.classed("active", false);
  d3.selectAll(".p-line").classed("inactive", false);
  d3.selectAll(".legend-cell").classed("inactive", false);
  d3.selectAll(".p-line.was-active").classed("active", true);
  d3.selectAll(".p-line.was-inactive").classed("inactive", true);
  d3.selectAll(".legend-cell.was-active").classed("active", true);
  d3.selectAll(".legend-cell.was-inactive").classed("inactive", true);
  d3.selectAll(".was-active").classed("was-active", false);
  d3.selectAll(".was-inactive").classed("was-inactive", false);
}

function getMainCategory(text) {
  return text.split(" ")[0];
}

function getSubCategory(text) {
  const subparts = text.split(" ");
  return subparts.slice(1, subparts.length).join(" ");
}

function legendCellClicked(dimensionClicked) {
  // if they are all active --> deactivate them and activte clicked one
  // if there are already inactive ones, only siwcth clicked
  // before return, if all inactive --> activate all
  if (d3.selectAll(".inactive").size() === 0) {
    d3.selectAll(".p-line").classed("inactive", true);
    d3.selectAll(".legend-cell").classed("inactive", true);
    toggleActiveness(dimensionClicked);
  } else {
    toggleActiveness(dimensionClicked);
  }
  if (
    d3.selectAll(".inactive").size() / 2 === d3.selectAll(".legend-cell").size()
  ) {
    d3.selectAll(".p-line").classed("inactive", false);
    d3.selectAll(".legend-cell").classed("inactive", false);
  }
}

document.querySelectorAll(".legend-cell").forEach(cell => {
  cell.addEventListener("click", event => {
    legendCellClicked(event.target.attributes.data.value);
  });
});
