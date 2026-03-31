console.log("js/form.js script loaded");


document.getElementById("userForm").addEventListener("submit", async function(event) {
  event.preventDefault();
  const formData = {
    firstname: this.firstname.value,
    surname: this.surname.value,
    age: Number(this.age.value)
  };
console.log("Submitting data:", formData);
  const response = await fetch("/.netlify/functions/save-user", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(formData)
  });

  const resultDiv = document.getElementById("result");
  if (response.ok) {
    resultDiv.textContent = "User added successfully!";
    this.reset();
  } else {
    const data = await response.json();
    console.log("Backend response:", data);   // <--- Add this!
    resultDiv.textContent = data.error || "Failed to add user.";
    resultDiv.style.color = "red";
  }
});