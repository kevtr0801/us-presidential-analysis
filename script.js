// Load the dataset
d3.csv("datasets/approval_averages.csv", d => {
    return { // Process each row to extract necessary columns
        institution: d['politician/institution'], // Institution or politician's name
        date: d3.timeParse("%Y-%m-%d")(d.date), // Parse date string into JavaScript Date object
        answer: d.answer, // Answer category (e.g., Approve or Disapprove)
        pct_estimate: +d.pct_estimate, // Percentage estimate (convert to number)
        lo: +d.lo, // Lower bound of confidence interval
        hi: +d.hi  // Upper bound of confidence interval
    };
}).then(data => {
    // Extract unique institutions (politicians or entities) from the data
    const institutions = Array.from(new Set(data.map(d => d.institution)));

    // Create a grid container for the 2x2 layout
    const gridContainer = d3.select("#approval-ratings")
        .style("display", "grid") // Use CSS grid for layout
        .style("grid-template-columns", "1fr 1fr") // 2 columns in the grid
        .style("gap", "20px"); // Space between grid items (controls spacing between plots)

    // Generate a plot for each institution
    institutions.forEach(institution => {
        // Filter data for the current institution
        const candidateData = data.filter(d => d.institution === institution);

        // Group data by answer category (e.g., Approve, Disapprove)
        const groupedData = d3.group(candidateData, d => d.answer);

        // Create a container (div) for the current institution's plot
        const container = gridContainer.append("div")
            .attr("class", "candidate-plot") // Assign a class for styling
            .style("border", "1px solid #ccc") // Border around each plot
            .style("padding", "10px") // Padding inside the box
            .style("border-radius", "5px") // Rounded corners
            .style("background-color", "#f9f9f9"); // Light background color

        // Add a title (h3) for the current institution
        container.append("h3")
            .style("text-align", "center") // Center align the title
            .style("margin-bottom", "10px") // Add spacing below the title
            .text(institution); // Display the institution name

        // Define dimensions and margins for the SVG plot
        const margin = { top: 70, right: 30, bottom: 40, left: 80 };
        const width = 500 - margin.left - margin.right; // Plot width
        const height = 400 - margin.top - margin.bottom; // Plot height

        // Define scales
        const x = d3.scaleTime().range([0, width]); // X-axis scale for time
        const y = d3.scaleLinear().range([height, 0]); // Y-axis scale for percentages

        // Define color scale for the answer categories
        const color = d3.scaleOrdinal()
            .domain(["Approve", "Disapprove"])
            .range(["#4CAF50", "#E91E63"]); // Green for Approve, Red for Disapprove

        // Create an SVG container inside the plot box
        const svg = container
            .append("svg")
                .attr("width", width + margin.left + margin.right) // Full SVG width
                .attr("height", height + margin.top + margin.bottom) // Full SVG height
            .append("g")
                .attr("transform", `translate(${margin.left},${margin.top})`); // Move inner group by margins

        // Define domains for the scales based on the data
        x.domain(d3.extent(candidateData, d => d.date)); // X-axis range from min to max date
        y.domain([0, d3.max(candidateData, d => d.hi)]); // Y-axis range from 0 to max upper bound (hi)

        // Add gridlines (horizontal and vertical)
        const xGrid = d3.axisBottom(x)
            .ticks(d3.timeMonth.every(3)) // Tick marks every 3 months
            .tickSize(-height) // Extend tick marks across the plot height
            .tickFormat(''); // No labels

        const yGrid = d3.axisLeft(y)
            .tickSize(-width) // Extend tick marks across the plot width
            .tickFormat(''); // No labels

        // Append horizontal gridlines
        svg.append("g")
            .attr("class", "grid")
            .attr("transform", `translate(0,${height})`) // Position at the bottom
            .call(xGrid);

        // Append vertical gridlines
        svg.append("g")
            .attr("class", "grid")
            .call(yGrid);

        // Add the X-axis to the plot
        svg.append("g")
            .attr("transform", `translate(0,${height})`) // Position at the bottom
            .call(d3.axisBottom(x)
                .ticks(d3.timeMonth.every(3)) // Tick marks every 3 months
                .tickFormat(d3.timeFormat("%b %Y"))) // Format as "Month Year"
            .selectAll("text")
            .attr("transform", "rotate(-45)") // Rotate labels for better readability
            .style("text-anchor", "end"); // Align labels to the end

        // Add the Y-axis to the plot
        svg.append("g")
            .call(d3.axisLeft(y)); // Draw the Y-axis on the left side

        // Add confidence intervals and lines for each answer category
        groupedData.forEach((values, key) => {
            // Add shaded confidence intervals
            svg.append("path")
                .datum(values) // Bind data for this category
                .attr("fill", color(key)) // Use the category color
                .attr("opacity", 0.2) // Transparent fill for confidence interval
                .attr("d", d3.area()
                    .x(d => x(d.date)) // Map date to X position
                    .y0(d => y(d.lo)) // Lower bound to Y position
                    .y1(d => y(d.hi)) // Upper bound to Y position
                );

            // Add the trend line for the category
            svg.append("path")
                .datum(values) // Bind data for this category
                .attr("fill", "none") // No fill for the line
                .attr("stroke", color(key)) // Use the category color
                .attr("stroke-width", 2.5) // Line thickness
                .attr("d", d3.line()
                    .x(d => x(d.date)) // Map date to X position
                    .y(d => y(d.pct_estimate)) // Map estimate to Y position
                );
        });

        // Add a vertical line for the crosshair effect
        const verticalLine = svg.append("line")
            .attr("stroke", "#000") // Black line
            .attr("stroke-width", 1) // Thin line
            .attr("opacity", 0) // Initially hidden
            .attr("y1", 0) // Start at the top
            .attr("y2", height); // Extend to the bottom

        // Add tooltip container for showing data on hover
        const tooltip = d3.select("body")
            .append("div")
            .style("position", "absolute") // Position relative to the page
            .style("background", "#fff") // White background
            .style("border", "1px solid #ccc") // Border styling
            .style("padding", "5px 10px") // Padding inside the tooltip
            .style("border-radius", "5px") // Rounded corners
            .style("font-size", "12px") // Small font
            .style("display", "none") // Initially hidden
            .style("pointer-events", "none"); // Prevent mouse interactions

        // Add an overlay for mouse interaction
        svg.append("rect")
            .attr("width", width) // Full plot width
            .attr("height", height) // Full plot height
            .attr("fill", "none") // Transparent overlay
            .attr("pointer-events", "all") // Capture all mouse events
            .on("mousemove", function (event) {
                const [mouseX] = d3.pointer(event); // Get the mouse X coordinate
                const hoveredDate = x.invert(mouseX); // Convert X coordinate to a date

                // Find the closest data points for each answer category
                let closestPoints = [];
                groupedData.forEach((values, key) => {
                    const closest = values.reduce((a, b) => {
                        return Math.abs(b.date - hoveredDate) < Math.abs(a.date - hoveredDate) ? b : a;
                    });
                    closestPoints.push({ key, ...closest });
                });

                // Update the vertical crosshair line
                verticalLine
                    .attr("x1", mouseX) // Move to mouse X position
                    .attr("x2", mouseX) // Keep it vertical
                    .attr("opacity", 1); // Show the line

                // Update the tooltip content and position
                tooltip.style("display", "block")
                    .html(closestPoints.map(p => `
                        <strong>${p.key}</strong><br>
                        Date: ${d3.timeFormat("%b %d, %Y")(p.date)}<br>
                        Value: ${p.pct_estimate.toFixed(1)}%
                    `).join("<br><br>"))
                    .style("left", (event.pageX + 10) + "px") // Position to the right of the mouse
                    .style("top", (event.pageY - 20) + "px"); // Slightly above the mouse
            })
            .on("mouseout", () => {
                verticalLine.attr("opacity", 0); // Hide the vertical line
                tooltip.style("display", "none"); // Hide the tooltip
            });

        // Style the cursor to a crosshair
        svg.style("cursor", "crosshair");
    });

}).catch(error => {
    console.error("Error loading the dataset:", error); // Log any errors in data loading
});
