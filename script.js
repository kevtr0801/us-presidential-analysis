// Function to render a plot for a single candidate
function renderPlot(data, institution, gridContainer) {
    const candidateData = data.filter(d => d.institution === institution);
    const groupedData = d3.group(candidateData, d => d.answer);

    const container = d3.select(gridContainer)
        .append("div")
        .attr("class", "candidate-plot")
        .style("border", "1px solid #ccc")
        .style("padding", "10px")
        .style("border-radius", "5px")
        .style("background-color", "#fff");

    container.append("h3")
        .style("text-align", "center")
        .text(institution);

    const margin = { top: 70, right: 30, bottom: 40, left: 80 };
    const width = 500 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const x = d3.scaleTime().range([0, width]);
    const y = d3.scaleLinear().range([height, 0]);

    const color = d3.scaleOrdinal()
        .domain(["Approve", "Disapprove"])
        .range(["#4CAF50", "#E91E63"]);

    const svg = container
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    x.domain(d3.extent(candidateData, d => d.date));
    y.domain([0, d3.max(candidateData, d => d.hi)]);

    // Add x-axis
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(d3.timeMonth.every(3)).tickFormat(d3.timeFormat("%b %Y")))
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end");

    // Add y-axis
    svg.append("g").call(d3.axisLeft(y));

    // Add confidence intervals and lines
    groupedData.forEach((values, key) => {
        svg.append("path")
            .datum(values)
            .attr("fill", color(key))
            .attr("opacity", 0.2)
            .attr("d", d3.area()
                .x(d => x(d.date))
                .y0(d => y(d.lo))
                .y1(d => y(d.hi))
            );

        svg.append("path")
            .datum(values)
            .attr("fill", "none")
            .attr("stroke", color(key))
            .attr("stroke-width", 2.5)
            .attr("d", d3.line()
                .x(d => x(d.date))
                .y(d => y(d.pct_estimate))
            );
    });
}

// Function to populate filter options
function populateFilterOptions(institutions, data) {
    const filterForm = document.getElementById("filter-form");
    filterForm.innerHTML = "";

    institutions.forEach(institution => {
        const label = document.createElement("label");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.value = institution;
        checkbox.name = "candidate-filter";

        checkbox.addEventListener("change", () => {
            applyFilter(data, institutions); // Apply filter whenever a checkbox is checked/unchecked
        });

        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(institution));
        filterForm.appendChild(label);
    });
}

// Function to apply filters dynamically
function applyFilter(data, institutions) {
    const selectedCandidates = Array.from(
        document.querySelectorAll("input[name='candidate-filter']:checked")
    ).map(checkbox => checkbox.value);

    const gridContainer = document.querySelector("#grid-container");
    gridContainer.innerHTML = ""; // Clear existing plots

    if (selectedCandidates.length === 0) {
        // Default: 2x2 grid for all candidates
        gridContainer.style.display = "grid";
        gridContainer.style.gridTemplateColumns = "1fr 1fr";
        institutions.forEach(institution => renderPlot(data, institution, gridContainer));
    } else {
        const gridColumns = Math.min(selectedCandidates.length, 2); // Max 2 columns
        gridContainer.style.display = "grid";
        gridContainer.style.gridTemplateColumns = `repeat(${gridColumns}, 1fr)`;
        selectedCandidates.forEach(candidate => renderPlot(data, candidate, gridContainer));
    }
}

// Tab switching function
function tabFunction(event, tabName) {
    const tabContents = document.querySelectorAll(".tabcontent");
    tabContents.forEach(content => content.style.display = "none");

    const tabLinks = document.querySelectorAll(".tablinks");
    tabLinks.forEach(tab => tab.classList.remove("active"));

    document.getElementById(tabName).style.display = "block";
    event.currentTarget.classList.add("active");

    const filterDropdown = document.getElementById("filter-dropdown");
    if (tabName === "approval-ratings") {
        filterDropdown.style.display = "block"; // Show filter dropdown
    } else {
        filterDropdown.style.display = "none"; // Hide filter dropdown
    }
}

// On page load
document.addEventListener("DOMContentLoaded", () => {
    d3.csv("datasets/approval_averages.csv", d => ({
        institution: d['politician/institution'],
        date: d3.timeParse("%Y-%m-%d")(d.date),
        answer: d.answer,
        pct_estimate: +d.pct_estimate,
        lo: +d.lo,
        hi: +d.hi
    })).then(data => {
        const institutions = Array.from(new Set(data.map(d => d.institution)));
        populateFilterOptions(institutions, data);
        applyFilter(data, institutions);

        document.querySelector(".tablinks").click(); // Simulate a click on the first tab
    });
});
