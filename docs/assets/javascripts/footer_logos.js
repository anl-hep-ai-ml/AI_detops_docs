document$.subscribe(() => {
  const footerMeta = document.querySelector(".md-footer-meta__inner");
  if (!footerMeta || footerMeta.querySelector(".footer-logos")) return;

  // Derive base URL from the header logo, which is always present
  const headerLogo = document.querySelector(".md-header__button.md-logo img");
  if (!headerLogo) return;
  const base = headerLogo.src.replace(/assets\/logo\/argonne\.png$/, "");

  const div = document.createElement("div");
  div.className = "footer-logos";
  div.innerHTML =
    `<img src="${base}assets/logo/argonne.png" alt="Argonne National Laboratory">` +
    `<img src="${base}assets/logo/doe.png" alt="U.S. Department of Energy">`;
  footerMeta.appendChild(div);
});
