// ============================
// 获取页面元素
// ============================

const loginForm =
    document.getElementById("loginForm");

const loginButton =
    document.getElementById("loginButton");

const buttonText =
    document.getElementById("buttonText");

const errorMessage =
    document.getElementById("errorMessage");

const passwordInput =
    document.getElementById("password");

const showPassword =
    document.getElementById("showPassword");


// ============================
// 显示错误
// ============================

function showError(message) {

    errorMessage.textContent =
        "⚠️ " + message;

    errorMessage.classList.add("show");
}


// ============================
// 隐藏错误
// ============================

function hideError() {

    errorMessage.textContent = "";

    errorMessage.classList.remove("show");
}


// ============================
// 显示 / 隐藏密码
// ============================

showPassword.addEventListener(
    "click",
    function () {

        if (
            passwordInput.type === "password"
        ) {

            passwordInput.type = "text";

            showPassword.textContent =
                "🙈";

        } else {

            passwordInput.type =
                "password";

            showPassword.textContent =
                "👁";
        }

    }
);


// ============================
// 登录
// ============================

loginForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();

        hideError();


        // ========================
        // 获取账号
        // ========================

        const user =
            document
                .getElementById("user")
                .value
                .trim();


        // ========================
        // 获取密码
        // ========================

        const password =
            passwordInput.value;


        // ========================
        // 基础检查
        // ========================

        if (!user) {

            showError("请输入账号");

            return;
        }


        if (!password) {

            showError("请输入密码");

            return;
        }


        // ========================
        // 登录按钮状态
        // ========================

        loginButton.disabled = true;

        buttonText.textContent =
            "登录中...";


        try {

            // ====================
            // 查询用户
            // ====================

            const {
                data,
                error
            } =
                await supabaseClient
                    .from("user")
                    .select("id, name, user, passwd")
                    .eq("user", user)
                    .maybeSingle();


            // ====================
            // 查询数据库失败
            // ====================

            if (error) {

                console.error(
                    "查询用户失败:",
                    error
                );

                showError(
                    "登录失败，请稍后再试"
                );

                return;
            }


            // ====================
            // 用户不存在
            // ====================

            if (!data) {

                showError(
                    "账号或密码错误"
                );

                return;
            }


            // ====================
            // 验证密码
            // ====================

            if (
                data.passwd !== password
            ) {

                showError(
                    "账号或密码错误"
                );

                return;
            }


            // ====================
            // 登录成功
            // ====================

            console.log(
                "登录成功:",
                data
            );


            // ====================
            // 保存登录状态
            // ====================

            const loginUser = {

                id: data.id,

                name: data.name,

                user: data.user

            };


            localStorage.setItem(
                "loginUser",
                JSON.stringify(loginUser)
            );


            // ====================
            // 跳转首页
            // ====================

            window.location.href =
                "index.html";


        } catch (error) {

            console.error(
                "系统错误:",
                error
            );

            showError(
                "网络连接失败，请稍后再试"
            );


        } finally {

            loginButton.disabled = false;

            buttonText.textContent =
                "登录";
        }

    }
);
