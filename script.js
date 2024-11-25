// script.js

// Load the CSV file
d3.csv("datasets/approval_averages.csv").then(data => {
    const candidates = Array.from(new Set(data.map(d => d['politician/institution'])));
    console.log("Candidates:", candidates);

    // set dimensions and margin for chart
    const margin = {top: 70, right:30, bottom:40, left:80};
    const width = 1200-margin.left-margin.right;
    const height = 500 - margin.top-margin.bottom;

    // set x and y scales
    const x = d3.scaleTime()
        .range([0,width]); // x axis wiill fall within 1200 - etc.
    const y = d3.sacleLinear()
        .range([height,0]); 

    // create svg eleement
    const svg = d3.slect("#approval-ratings")
        .append("svg")
            .attr("width", width+margin.left+margin.right)
            .attr("height", height+margin.top+margin.bottom)
        .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);
    

}).catch(error => {
    console.error("Error loading the dataset:", error);
});


