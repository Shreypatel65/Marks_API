document.addEventListener("DOMContentLoaded", async function () {

    await getKeys();

    // document.getElementById("upload-form").addEventListener("submit", async (event) => {

    // });

document.getElementById("keygen").addEventListener("submit", async (event) => {
    event.preventDefault();
    const uname = document.getElementById('uname').value;

    const response = await fetch('/keygen', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ uname })
    });
    await getKeys();
});

document.getElementById("change_pass").addEventListener("submit", async (event) => {
    event.preventDefault();
    const old_pass = document.getElementById("old_pass").value;
    const new_pass = document.getElementById("new_pass").value;

    const response = await fetch('/changepwd', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ old_pass, new_pass })
    });

    const data = response.json();
    console.log(data);
    const txtarea = document.querySelector(".pass_area");

    txtarea.innerHTML = data.message
});
    
});

async function getKeys() {
    const keygetButton = document.getElementById('keyget');

    const response = await fetch('/keys', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    });

    const data = await response.json();
    console.log(data);

    const txtarea = document.querySelector('.keytable');
    var text = "<table class='table table-hover'><tr><th>Names</th><th>Keys</th><th>Delete Key</th></tr>";

    data.forEach(element => {
        text += `<tr><td>${element._id}</td><td>${element.key}
                                </td><td>
                                
                                <input type="button" class="button-30 delete-button" name="${element._id}" value="Delete">
                                </td></tr>`;
    });

    text += "</table>";
    txtarea.innerHTML = text;

    // Delete Script
    var deleteButtons = document.querySelectorAll('.delete-button');

    deleteButtons.forEach(button => {
        button.addEventListener('click', async () => {
            const id = button.getAttribute('name');

            const response = await fetch(`/delete?name=${id}`, {
                method: 'GET'
            });
            if (response.ok) {
                console.log('Item deleted successfully.');
                await getKeys();
            } else {
                console.log("Not deleted");
            }
        });
    });
}


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
