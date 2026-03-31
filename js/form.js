document.getElementById("userForm").addEventListener("submit", async function(event) {
  event.preventDefault();

  const formData = {
    firstname: this.firstname.value,
    surname: this.surname.value,
    age: parseInt(this.age.value, 10)
  };

  // Replace with your deployed backend URL
  const response = await fetch("https://your-backend-url/api/user", {
    method: "POST",
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(formData)
  });

  const resultDiv = document.getElementById("result");
  if (response.ok) {
    resultDiv.textContent = "User added successfully!";
    this.reset();
  } else {
    resultDiv.textContent = "Failed to add user.";
    resultDiv.style.color = "red";
  }
});