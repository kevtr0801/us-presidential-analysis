// Function to render a plot for a single candidate
function renderPlot(data, institution, gridContainer) {
    // Filter data for the selected institution
    const candidateData = data.filter(d => d.institution === institution);

    // Group data by response category (e.g., Approve, Disapprove)
    const groupedData = d3.group(candidateData, d => d.answer);

    // Create a container for the plot
    const container = d3.select(gridContainer)
        .append("div") // Each candidate gets its own div
        .attr("class", "candidate-plot") // Apply candidate-plot styling
        .style("border", "1px solid #ccc") // Add a border
        .style("padding", "10px") // Add padding
        .style("border-radius", "5px") // Rounded corners
        .style("background-color", "#fff"); // Light background for contrast

    // Add a title (candidate/institution name)
    container.append("h3")
        .style("text-align", "center") // Center-align the title
        .text(institution); // Use the institution name

    // Set up dimensions and margins for the chart
    const margin = { top: 50, right: 20, bottom: 50, left: 50 };
    const width = 400 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    // Create an SVG element for the plot
    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right) // Include margins in width
        .attr("height", height + margin.top + margin.bottom) // Include margins in height
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`); // Move to account for margins

    // Create scales for the X (time) and Y (percentage) axes
    const x = d3.scaleTime().range([0, width]);
    const y = d3.scaleLinear().range([height, 0]);

    // Set the domains (input values) for the scales based on data
    x.domain(d3.extent(candidateData, d => d.date)); // Use the date range for X
    y.domain([0, d3.max(candidateData, d => d.hi)]); // Use the maximum confidence interval for Y

    // Add the X-axis
    svg.append("g")
        .attr("transform", `translate(0,${height})`) // Position at the bottom
        .call(d3.axisBottom(x).tickFormat(d3.timeFormat("%b %Y"))) // Format ticks as "Month Year"
        .selectAll("text") // Select tick labels
        .attr("transform", "rotate(-45)") // Rotate labels for better fit
        .style("text-anchor", "end"); // Align text to the end of ticks

    // Add the Y-axis
    svg.append("g")
        .call(d3.axisLeft(y)); // Add the Y-axis on the left

    // Add gridlines 
    svg.append("g")
        .attr("class", "grid") // Use CSS for grid styling
        .attr("transform", `translate(0,${height})`) // Position at the bottom
        .call(d3.axisBottom(x).tickSize(-height).tickFormat("")) // Horizontal gridlines
        .selectAll(".tick line")
        .style("stroke", "gray")
        .style("stroke-width", 0.5)
        .style("stroke-dasharray", "3 3");

    svg.append("g")
        .attr("class", "grid") // Use CSS for grid styling
        .call(d3.axisLeft(y).tickSize(-width).tickFormat("")) // Vertical gridlines
        .selectAll(".tick line")
        .style("stroke", "gray")
        .style("stroke-width", 0.5)
        .style("stroke-dasharray", "3 3");

    // Add confidence intervals (shaded areas) and trend lines for each category
    groupedData.forEach((values, key) => {
        // Add the confidence interval
        svg.append("path")
            .datum(values) // Bind the data
            .attr("fill", key === "Approve" ? "#4CAF50" : "#E91E63") // Color by category
            .attr("opacity", 0.2) // Slightly transparent
            .attr("d", d3.area()
                .x(d => x(d.date)) // X is the date
                .y0(d => y(d.lo)) // Y0 is the lower bound
                .y1(d => y(d.hi)) // Y1 is the upper bound
            );

        // Add the trend line
        svg.append("path")
            .datum(values) // Bind the data
            .attr("fill", "none") // No fill for the line
            .attr("stroke", key === "Approve" ? "#4CAF50" : "#E91E63") // Color by category
            .attr("stroke-width", 2) // Line thickness
            .attr("d", d3.line()
                .x(d => x(d.date)) // X is the date
                .y(d => y(d.pct_estimate)) // Y is the percentage estimate
            );
    });

    // Add a vertical line for the crosshair effect
    const verticalLine = svg.append("line")
        .attr("stroke", "black")
        .attr("stroke-width", 1)
        .attr("y1", 0)
        .attr("y2", height)
        .attr("opacity", 0); // Initially hidden

    // Tooltip for showing data details
    const tooltip = d3.select("body")
        .append("div")
        .style("position", "absolute")
        .style("background", "#fff")
        .style("border", "1px solid #ccc")
        .style("padding", "10px")
        .style("border-radius", "5px")
        .style("font-size", "12px")
        .style("display", "none") // Hidden by default
        .style("pointer-events", "none"); // Prevent interactions

    // Add an invisible overlay for capturing mouse events
    svg.append("rect")
        .attr("width", width)
        .attr("height", height)
        .attr("fill", "none")
        .attr("pointer-events", "all")
        .on("mousemove", function (event) {
            // Find the mouse position
            const [mouseX] = d3.pointer(event);
            const hoveredDate = x.invert(mouseX); // Convert to date

            // Find the closest data points for each category
            const closestPoints = [];
            groupedData.forEach((values, key) => {
                const closest = values.reduce((a, b) =>
                    Math.abs(b.date - hoveredDate) < Math.abs(a.date - hoveredDate) ? b : a
                );
                closestPoints.push({ key, ...closest });
            });

            // Update the vertical line position
            verticalLine
                .attr("x1", mouseX)
                .attr("x2", mouseX)
                .attr("opacity", 1);

            // Show and position the tooltip
            tooltip.style("display", "block")
                .html(closestPoints.map(p => `
                    <strong>${p.key}</strong><br>
                    Date: ${d3.timeFormat("%b %d, %Y")(p.date)}<br>
                    Value: ${p.pct_estimate.toFixed(1)}%
                `).join("<br><br>"))
                .style("left", `${event.pageX + 15}px`)
                .style("top", `${event.pageY - 30}px`);
        })
        .on("mouseout", () => {
            // Hide the vertical line and tooltip
            verticalLine.attr("opacity", 0);
            tooltip.style("display", "none");
        });
}

// Populate filter options dynamically
function populateFilterOptions(institutions, data) {
    const filterForm = document.getElementById("filter-form");
    filterForm.innerHTML = ""; // Clear any existing options

    // Create a checkbox for each institution
    institutions.forEach(institution => {
        const label = document.createElement("label");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.value = institution;
        checkbox.name = "candidate-filter";

        // Apply filter when the checkbox is toggled
        checkbox.addEventListener("change", () => applyFilter(data, institutions));

        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(institution));
        filterForm.appendChild(label);
    });
}

// Apply filters and update the grid layout
function applyFilter(data, institutions) {
    const selected = Array.from(
        document.querySelectorAll("input[name='candidate-filter']:checked")
    ).map(checkbox => checkbox.value); // Get the selected candidates

    const gridContainer = document.getElementById("grid-container");
    gridContainer.innerHTML = ""; // Clear existing plots

    if (selected.length === 0) {
        // Default: 2x2 grid for all candidates
        gridContainer.className = "grid-container two-columns";
        institutions.forEach(inst => {
            const plotContainer = document.createElement("div");
            plotContainer.className = "candidate-plot fade-in"; // Add fade-in class
            gridContainer.appendChild(plotContainer);

            renderPlot(data, inst, plotContainer);
        });
    } else if (selected.length === 1) {
        // Single column layout for one candidate
        gridContainer.className = "grid-container single-column";
        selected.forEach(candidate => {
            const plotContainer = document.createElement("div");
            plotContainer.className = "candidate-plot fade-in"; // Add fade-in class
            gridContainer.appendChild(plotContainer);

            renderPlot(data, candidate, plotContainer);
        });
    } else {
        // Adjust grid based on the number of candidates selected
        const gridColumns = Math.min(selected.length, 2);
        gridContainer.className = "grid-container";
        gridContainer.style.gridTemplateColumns = `repeat(${gridColumns}, 1fr)`;
        selected.forEach(candidate => {
            const plotContainer = document.createElement("div");
            plotContainer.className = "candidate-plot fade-in"; // Add fade-in class
            gridContainer.appendChild(plotContainer);

            renderPlot(data, candidate, plotContainer);
        });
    }
}


// Tab switching function
function tabFunction(event, tabName) {
    const tabContents = document.querySelectorAll(".tabcontent");
    const tabLinks = document.querySelectorAll(".tablinks");

    // Hide all tabs and reset fade-in classes
    tabContents.forEach(content => {
        content.style.display = "none"; // Hide all tabs
        content.classList.remove("fade-in");
    });

    tabLinks.forEach(tab => tab.classList.remove("active")); // Deactivate all tabs

    // Show and fade-in the selected tab
    const selectedTab = document.getElementById(tabName);
    selectedTab.style.display = "block"; // Make the tab visible
    setTimeout(() => {
        selectedTab.classList.add("fade-in");
    }, 10);

    event.currentTarget.classList.add("active"); // Mark the clicked tab as active
}

// Initialize on DOMContentLoaded
document.addEventListener("DOMContentLoaded", () => {
    // Load the dataset and preprocess it
    d3.csv("datasets/approval_averages.csv", d => ({
        institution: d["politician/institution"],
        date: d3.timeParse("%Y-%m-%d")(d.date),
        answer: d.answer,
        pct_estimate: +d.pct_estimate,
        lo: +d.lo,
        hi: +d.hi
    })).then(data => {
        const institutions = [...new Set(data.map(d => d.institution))];
        populateFilterOptions(institutions, data);
        applyFilter(data, institutions);
        document.querySelector(".tablinks").click();
    });
});
