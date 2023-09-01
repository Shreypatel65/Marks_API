document.addEventListener("DOMContentLoaded", async function () {
    // Load API keys and set up event listeners when the DOM is ready

    // Load and display API keys
    await getKeys();

    // Event listener for file upload form submission
    document.getElementById("upload-form").addEventListener("submit", async function (event) {
        event.preventDefault();

        // Gather form data
        const formData = new FormData(this);

        // Send a POST request to upload the file
        const response = await fetch('/admin/upload', {
            method: "POST",
            body: formData,
        });

        // Display the response message as an alert
        const data = await response.json()
        console.log(data.message);
        window.alert(data.message);
    });

    // Event listener for generating a new API key
    document.getElementById("keygen").addEventListener("submit", async (event) => {
        event.preventDefault();
        const uname = document.getElementById('uname').value;

        // Send a POST request to generate a new API key
        const response = await fetch('/admin/keygen', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ uname })
        });

        // Display the response message as an alert
        const data = await response.json();
        console.log(data.message);
        window.alert(data.message);

        // Refresh the displayed API keys
        await getKeys();
    });

    // Event listener for changing the password
    document.getElementById("change_pass").addEventListener("submit", async (event) => {
        event.preventDefault();
        const old_pass = document.getElementById("old_pass").value;
        const new_pass = document.getElementById("new_pass").value;

        // Send a POST request to change the password
        const response = await fetch('/admin/changepwd', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ old_pass, new_pass })
        });

        // Display the response message as an alert
        const data = await response.json();
        console.log(data);
        window.alert(data.message);
    });
});

// Function to fetch and display API keys
async function getKeys() {
    const keygetButton = document.getElementById('keyget');

    // Send a GET request to retrieve API keys
    const response = await fetch('/admin/keys', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    });

    // Parse the response as JSON
    const data = await response.json();
    console.log(data);

    // Display the API keys in a table
    const txtarea = document.querySelector('.keytable');
    var text = "<table class='table table-hover'><tr><th>Names</th><th>Keys</th><th>Delete Key</th></tr>";

    data.forEach(element => {
        text += `<tr>
        <td>${element._id}</td>
        <td>${element.key}</td>
        <td><input type="button" class="button-30 delete-button" name="${element._id}" value="Delete"></td>
        </tr>`;
    });

    text += "</table>";
    txtarea.innerHTML = text;

    // Set up event listeners for delete buttons
    var deleteButtons = document.querySelectorAll('.delete-button');

    deleteButtons.forEach(button => {
        button.addEventListener('click', async () => {
            const id = button.getAttribute('name');

            // Send a GET request to delete an API key
            const response = await fetch(`/admin/delete?name=${id}`, {
                method: 'GET'
            });
            if (response.ok) {
                console.log('Item deleted successfully.');
                // Refresh the displayed API keys
                await getKeys();
            } else {
                console.log("Not deleted");
            }
        });
    });
}

// Function to display the selected file name in the file input
function showfilename(input) {
    const fileNameDisplay = document.getElementById("fileNameDisplay");
    const selectedFile = input.files[0];

    if (selectedFile) {
        fileNameDisplay.innerText = selectedFile.name;
        fileNameDisplay.style.display = "block";
    } else {
        fileNameDisplay.innerText = "";
        fileNameDisplay.style.display = "none";
    }
}
