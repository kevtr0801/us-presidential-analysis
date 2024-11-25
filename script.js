// script.js

// Load the CSV file
d3.csv("datasets/approval_averages.csv").then(data => {
    console.log(data); // Check the data in the console

    // You can now use the data to build visualizations!
}).catch(error => {
    console.error("Error loading the dataset:", error);
});
s