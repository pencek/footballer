// ============================
// 检查登录状态
// ============================

const loginUserData =
    localStorage.getItem("loginUser");


if (!loginUserData) {

    window.location.href = "login.html";

    throw new Error("用户未登录");

}


let loginUser;


try {

    loginUser =
        JSON.parse(loginUserData);

} catch (error) {

    localStorage.removeItem("loginUser");

    window.location.href = "login.html";

    throw new Error("登录信息错误");

}


// ============================
// 获取页面元素
// ============================

const currentUserName =
    document.getElementById("currentUserName");

const currentUserAvatar =
    document.getElementById("currentUserAvatar");

const playerCount =
    document.getElementById("playerCount");

const rankingList =
    document.getElementById("rankingList");

const loading =
    document.getElementById("loading");

const refreshButton =
    document.getElementById("refreshButton");

const logoutButton =
    document.getElementById("logoutButton");


// ============================
// 评分弹窗元素
// ============================

const ratingModal =
    document.getElementById("ratingModal");

const closeModal =
    document.getElementById("closeModal");

const ratingPlayerName =
    document.getElementById("ratingPlayerName");

const scoreRange =
    document.getElementById("scoreRange");

const scoreValue =
    document.getElementById("scoreValue");

const submitRating =
    document.getElementById("submitRating");


// 当前正在评分的用户ID

let selectedPlayerId = null;


// ============================
// 显示当前用户
// ============================

currentUserName.textContent =
    loginUser.name || "用户";


currentUserAvatar.textContent =
    getInitial(loginUser.name);


// ============================
// 加载排行榜
// ============================

async function loadRanking() {

    console.log("开始加载排行榜...");


    loading.style.display =
        "flex";


    loading.innerHTML = `
        <div class="loading-spinner"></div>

        <p>
            正在加载球员数据...
        </p>
    `;


    rankingList.innerHTML =
        "";


    refreshButton.disabled =
        true;


    try {

        // ========================
        // 调用数据库排行榜函数
        // ========================

        const {
            data,
            error
        } =
            await supabaseClient
                .rpc(
                    "get_player_ranking"
                );


        // ========================
        // 数据库错误
        // ========================

        if (error) {

            console.error(
                "排行榜错误：",
                error
            );


            loading.innerHTML = `

                <p style="color:#ff6b6b;">

                    排行榜加载失败

                </p>


                <p style="
                    margin-top:8px;
                    font-size:11px;
                    color:#65736a;
                ">

                    ${escapeHTML(
                error.message
            )}

                </p>

            `;


            return;

        }


        console.log(
            "排行榜数据：",
            data
        );


        loading.style.display =
            "none";


        // ========================
        // 没有用户
        // ========================

        if (
            !data ||
            data.length === 0
        ) {

            playerCount.textContent =
                "0";


            rankingList.innerHTML = `

                <div class="loading">

                    <p>
                        暂时还没有用户
                    </p>

                </div>

            `;


            return;

        }


        // ========================
        // 用户数量
        // ========================

        playerCount.textContent =
            data.length;


        // ========================
        // 创建排行榜
        // ========================

        data.forEach(
            (player, index) => {

                createPlayer(
                    player,
                    index
                );

            }
        );


    } catch (error) {

        console.error(
            "排行榜系统错误：",
            error
        );


        loading.innerHTML = `

            <p style="color:#ff6b6b;">

                网络连接失败，请稍后再试

            </p>

        `;


    } finally {

        refreshButton.disabled =
            false;

    }

}


// ============================
// 创建球员排行榜项目
// ============================

function createPlayer(
    player,
    index
) {

    const element =
        document.createElement(
            "div"
        );


    element.className =
        "player";


    // ========================
    // 是否是当前用户
    // ========================

    const isSelf =
        Number(player.id) ===
        Number(loginUser.id);


    // ========================
    // 评分人数
    // ========================

    const ratingCount =
        Number(
            player.rating_count || 0
        );


    // ========================
    // 平均分
    // ========================

    const averageScore =
        player.average_score === null
            ? null
            : Number(
                player.average_score
            );


    // ========================
    // 分数 HTML
    // ========================

    let scoreHTML;


    if (
        ratingCount === 0 ||
        averageScore === null ||
        Number.isNaN(averageScore)
    ) {

        scoreHTML = `

            <div class="score-number no-score">

                暂无

            </div>

        `;

    } else {

        scoreHTML = `

            <div class="score-number">

                ${averageScore.toFixed(2)}

            </div>

        `;

    }


    // ========================
    // 操作 HTML
    // ========================

    let actionHTML;


    if (isSelf) {

        actionHTML = `

            <div class="self-label">

                这是你自己

            </div>

        `;

    } else {

        actionHTML = `

            <button
                type="button"
                class="rate-button"
                data-id="${player.id}">

                ⭐ 给TA评分

            </button>

        `;

    }


    // ========================
    // 球员 HTML
    // ========================

    element.innerHTML = `

        <div class="rank">

            #${index + 1}

        </div>


        <div class="player-info">

            <div class="avatar">

                ${getInitial(player.name)}

            </div>


            <div>

                <div class="player-name">

                    ${escapeHTML(
        player.name
    )}

                </div>


                <div class="player-account">

                    @${escapeHTML(
        player.username
    )}

                </div>

            </div>

        </div>


        <div class="score">

            ${scoreHTML}


            <div class="score-label">

                平均评分

            </div>

        </div>


        <div class="player-action">

            <div class="rating-count">

                ${ratingCount} 人评分

            </div>


            ${actionHTML}

        </div>

    `;


    rankingList.appendChild(
        element
    );


    // ========================
    // 绑定评分按钮
    // ========================

    if (!isSelf) {

        const button =
            element.querySelector(
                ".rate-button"
            );


        button.addEventListener(
            "click",
            function () {

                console.log(
                    "点击评分:",
                    player
                );


                openRatingModal(
                    Number(player.id),
                    player.name
                );

            }
        );

    }

}


// ============================
// 打开评分弹窗
// ============================

function openRatingModal(
    playerId,
    playerName
) {

    console.log(
        "打开评分窗口:",
        playerId,
        playerName
    );


    // ========================
    // 保存当前评分对象
    // ========================

    selectedPlayerId =
        playerId;


    // ========================
    // 设置球员名称
    // ========================

    ratingPlayerName.textContent =
        playerName;


    // ========================
    // 默认5分
    // ========================

    scoreRange.value =
        5;


    scoreValue.textContent =
        "5";


    // ========================
    // 打开弹窗
    // ========================

    ratingModal.classList.add(
        "show"
    );

}


// ============================
// 关闭评分弹窗
// ============================

function closeRatingModal() {

    ratingModal.classList.remove(
        "show"
    );


    selectedPlayerId =
        null;


    // 恢复默认评分

    scoreRange.value =
        5;


    scoreValue.textContent =
        "5";

}


// ============================
// 点击关闭按钮
// ============================

closeModal.addEventListener(
    "click",
    closeRatingModal
);


// ============================
// 点击背景关闭
// ============================

ratingModal.addEventListener(
    "click",
    function (event) {

        if (
            event.target ===
            ratingModal
        ) {

            closeRatingModal();

        }

    }
);


// ============================
// ESC关闭
// ============================

document.addEventListener(
    "keydown",
    function (event) {

        if (
            event.key === "Escape"
        ) {

            if (
                ratingModal.classList.contains(
                    "show"
                )
            ) {

                closeRatingModal();

            }

        }

    }
);


// ============================
// 评分滑块
// ============================

scoreRange.addEventListener(
    "input",
    function () {

        const score =
            Number(
                scoreRange.value
            );


        // ========================
        // 强制验证
        // ========================

        if (
            !Number.isInteger(score) ||
            score < 0 ||
            score > 5
        ) {

            scoreRange.value =
                5;


            scoreValue.textContent =
                "5";


            return;

        }


        // ========================
        // 显示整数评分
        // ========================

        scoreValue.textContent =
            String(score);

    }
);


// ============================
// 提交评分
// ============================

submitRating.addEventListener(
    "click",
    async function () {

        // ========================
        // 没有选择用户
        // ========================

        if (
            selectedPlayerId === null
        ) {

            alert(
                "请选择要评分的球员"
            );

            return;

        }


        // ========================
        // 获取评分
        // ========================

        const score =
            Number(
                scoreRange.value
            );


        console.log(
            "准备提交评分:",
            {
                rater: loginUser.id,
                target: selectedPlayerId,
                score: score
            }
        );


        // ========================
        // 评分范围验证
        // ========================

        if (
            !Number.isInteger(score) ||
            score < 0 ||
            score > 5
        ) {

            alert(
                "评分必须是0～5的整数"
            );

            return;

        }


        // ========================
        // 防止自己给自己评分
        // ========================

        if (
            Number(loginUser.id) ===
            Number(selectedPlayerId)
        ) {

            alert(
                "不能给自己评分"
            );


            closeRatingModal();


            return;

        }


        // ========================
        // 按钮状态
        // ========================

        submitRating.disabled =
            true;


        submitRating.textContent =
            "提交中...";


        try {

            // ====================
            // 调用数据库函数
            // ====================

            const {
                data,
                error
            } =
                await supabaseClient
                    .rpc(
                        "rate_player",
                        {

                            rater:
                                Number(
                                    loginUser.id
                                ),

                            target:
                                Number(
                                    selectedPlayerId
                                ),

                            target_score:
                            score

                        }
                    );


            // ====================
            // 数据库错误
            // ====================

            if (error) {

                console.error(
                    "评分失败:",
                    error
                );


                alert(
                    "评分失败：\n" +
                    error.message
                );


                return;

            }


            console.log(
                "评分成功:",
                data
            );


            // ====================
            // 提示
            // ====================

            alert(
                "评分成功！"
            );


            // ====================
            // 关闭弹窗
            // ====================

            closeRatingModal();


            // ====================
            // 重新加载排行榜
            // ====================

            await loadRanking();


        } catch (error) {

            console.error(
                "评分系统错误:",
                error
            );


            alert(
                "网络连接失败，请稍后再试"
            );

        } finally {

            // ====================
            // 恢复按钮
            // ====================

            submitRating.disabled =
                false;


            submitRating.textContent =
                "提交评分";

        }

    }
);


// ============================
// 刷新排行榜
// ============================

refreshButton.addEventListener(
    "click",
    function () {

        loadRanking();

    }
);


// ============================
// 退出登录
// ============================

logoutButton.addEventListener(
    "click",
    function () {

        localStorage.removeItem(
            "loginUser"
        );


        window.location.href =
            "login.html";

    }
);


// ============================
// 获取头像文字
// ============================

function getInitial(name) {

    if (!name) {

        return "?";

    }


    return name
        .trim()
        .charAt(0)
        .toUpperCase();

}


// ============================
// 防止 HTML 注入
// ============================

function escapeHTML(text) {

    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        text || "";


    return div.innerHTML;

}


// ============================
// 启动
// ============================

loadRanking();
