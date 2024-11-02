// todo
import "./style.css";

const app: HTMLDivElement = document.querySelector("#app")!;

const alertButton: HTMLButtonElement = document.createElement("button");
alertButton.innerHTML = "ALERT";
app.append(alertButton);
alertButton.addEventListener("click", () => {
  alert("you clicked the button!");
});
