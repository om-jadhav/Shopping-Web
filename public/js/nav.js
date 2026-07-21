async function renderNav() {

    const nav = document.getElementById("navLinks");
    if (!nav) return;

    const current = window.location.pathname;
    const token = getToken();
    
    function makeLinks(list) {
        return list.map(link => `
            <a href="${link.href}"
               class="${current === link.href ? "active" : ""}">
               ${link.label}
            </a>
        `).join("");
    }

    let links = [];

    if (!token) {

        links = [
            {href:"/products.html",label:"Shop"},
            {href:"/customize.html",label:"Custom T-Shirt"},
            {href:"/login.html",label:"Login"},
            {href:"/signup.html",label:"Signup"}
        ];

        nav.innerHTML = makeLinks(links);

    } else {

        try{

            const me = await apiGet("/auth/me",token);

            const admin = me.profile?.role==="admin";

            links = [
                {href:"/products.html",label:"Shop"},
                ...(admin?[]:[{href:"/customize.html",label:"Custom T-Shirt"}]),
                ...(admin?[]:[{href:"/orders.html",label:"Orders"}]),
                {
                    href:admin?"/admin.html":"/index.html",
                    label:admin?"Admin":"My Account"
                },
                ...(admin?[]:[{href:"/cart.html",label:"Cart"}])
            ];

            nav.innerHTML =
                makeLinks(links) +
                `<a href="#" id="logoutBtn">Logout</a>`;

            document
            .getElementById("logoutBtn")
            .onclick = async e=>{

                e.preventDefault();

                try{
                    await apiPost("/auth/logout",{},token);
                }catch(e){}

                clearToken();

                location.reload();

            };

        }catch{

            clearToken();

            location.reload();

        }

    }
const toggle = document.getElementById("menuToggle");

if (toggle) {
    toggle.onclick = () => {
        nav.classList.toggle("open");
    };
}
}

renderNav();