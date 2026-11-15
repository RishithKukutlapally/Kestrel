import "./styles.css";

const err = new URLSearchParams(window.location.search).get("error");
if (err) {
  const el = document.getElementById("login-error")!;
  el.textContent =
    err === "throttled" ? "Too many attempts. Wait a minute and try again." : "Username or password is not correct.";
  el.classList.remove("hidden");
}
