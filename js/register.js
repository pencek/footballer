// ============================
// 获取页面元素
// ============================

const registerForm =
    document.getElementById("registerForm");

const registerButton =
    document.getElementById("registerButton");

const buttonText =
    document.getElementById("buttonText");

const message =
    document.getElementById("message");


// ============================
// 显示错误
// ============================

function showError(text) {

    message.textContent =
        "⚠️ " + text;

    message.className =
        "message error show";
}


// ============================
// 显示成功
// ============================

function showSuccess(text) {

    message.textContent =
        "✓ " + text;

    message.className =
        "message success show";
}


// ============================
// 隐藏消息
// ============================

function hideMessage() {

    message.textContent = "";

    message.className =
        "message";
}


// ============================
// 显示 / 隐藏密码
// ============================

const passwordButtons =
    document.querySelectorAll(
        ".show-password"
    );


passwordButtons.forEach(
    function (button) {

        button.addEventListener(
            "click",
            function () {

                const targetId =
                    button.dataset.target;

                const input =
                    document.getElementById(
                        targetId
                    );


                if (
                    input.type === "password"
                ) {

                    input.type = "text";

                    button.textContent =
                        "🙈";

                } else {

                    input.type =
                        "password";

                    button.textContent =
                        "👁";
                }

            }
        );

    }
);


// ============================
// 注册
// ============================

registerForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();

        hideMessage();


        // ========================
        // 获取输入
        // ========================

        const name =
            document
                .getElementById("name")
                .value
                .trim();


        const user =
            document
                .getElementById("user")
                .value
                .trim();


        const passwd =
            document
                .getElementById("passwd")
                .value;


        const confirmPasswd =
            document
                .getElementById("confirmPasswd")
                .value;


        // ========================
        // 检查用户名
        // ========================

        if (!name) {

            showError(
                "请输入用户名"
            );

            return;
        }


        // ========================
        // 检查账号
        // ========================

        if (!user) {

            showError(
                "请输入账号"
            );

            return;
        }


        if (user.length < 3) {

            showError(
                "账号至少需要 3 个字符"
            );

            return;
        }


        // ========================
        // 检查密码
        // ========================

        if (!passwd) {

            showError(
                "请输入密码"
            );

            return;
        }


        if (passwd.length < 6) {

            showError(
                "密码至少需要 6 个字符"
            );

            return;
        }


        // ========================
        // 检查确认密码
        // ========================

        if (
            passwd !== confirmPasswd
        ) {

            showError(
                "两次输入的密码不一致"
            );

            return;
        }


        // ========================
        // 注册按钮
        // ========================

        registerButton.disabled = true;

        buttonText.textContent =
            "注册中...";


        try {

            // ====================
            // 检查账号是否存在
            // ====================

            const {
                data: existingUser,
                error: checkUserError
            } =
                await supabaseClient
                    .from("user")
                    .select("id")
                    .eq("user", user)
                    .maybeSingle();


            if (checkUserError) {

                console.error(
                    "检查账号失败:",
                    checkUserError
                );

                showError(
                    "无法检查账号，请稍后再试"
                );

                return;
            }


            if (existingUser) {

                showError(
                    "这个账号已经被注册"
                );

                return;
            }


            // ====================
            // 检查用户名是否存在
            // ====================

            const {
                data: existingName,
                error: checkNameError
            } =
                await supabaseClient
                    .from("user")
                    .select("id")
                    .eq("name", name)
                    .maybeSingle();


            if (checkNameError) {

                console.error(
                    "检查用户名失败:",
                    checkNameError
                );

                showError(
                    "无法检查用户名，请稍后再试"
                );

                return;
            }


            if (existingName) {

                showError(
                    "这个用户名已经被使用"
                );

                return;
            }


            // ====================
            // 写入数据库
            // ====================

            const {
                data,
                error
            } =
                await supabaseClient
                    .from("user")
                    .insert({

                        name: name,

                        user: user,

                        passwd: passwd

                    })
                    .select()
                    .single();


            // ====================
            // 数据库错误
            // ====================

            if (error) {

                console.error(
                    "注册失败:",
                    error
                );


                // 唯一约束错误

                if (
                    error.code === "23505"
                ) {

                    showError(
                        "用户名或账号已经存在"
                    );

                } else {

                    showError(
                        "注册失败：" +
                        error.message
                    );
                }

                return;
            }


            // ====================
            // 注册成功
            // ====================

            console.log(
                "注册成功:",
                data
            );


            showSuccess(
                "注册成功！正在跳转到登录页面..."
            );


            // 清空表单

            registerForm.reset();


            // 跳转登录

            setTimeout(
                function () {

                    window.location.href =
                        "login.html";

                },
                1500
            );


        } catch (error) {

            console.error(
                "系统错误:",
                error
            );

            showError(
                "网络连接失败，请稍后再试"
            );


        } finally {

            registerButton.disabled = false;

            buttonText.textContent =
                "创建账号";

        }

    }
);
