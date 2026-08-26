// ============================================================
// Footballer - 球员排行榜
// index.js
// ============================================================


// ============================================================
// 1. 检查登录状态
// ============================================================

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

    console.error(
        "登录信息解析失败:",
        error
    );

    localStorage.removeItem(
        "loginUser"
    );

    window.location.href =
        "login.html";

    throw new Error(
        "登录信息错误"
    );

}


// ============================================================
// 2. 获取页面元素
// ============================================================

const currentUserName =
    document.getElementById(
        "currentUserName"
    );


const currentUserAvatar =
    document.getElementById(
        "currentUserAvatar"
    );


const playerCount =
    document.getElementById(
        "playerCount"
    );


const rankingList =
    document.getElementById(
        "rankingList"
    );


const loading =
    document.getElementById(
        "loading"
    );


const refreshButton =
    document.getElementById(
        "refreshButton"
    );


const logoutButton =
    document.getElementById(
        "logoutButton"
    );


// ============================================================
// 3. 评分弹窗元素
// ============================================================

const ratingModal =
    document.getElementById(
        "ratingModal"
    );


const closeModal =
    document.getElementById(
        "closeModal"
    );


const ratingPlayerName =
    document.getElementById(
        "ratingPlayerName"
    );


const scoreRange =
    document.getElementById(
        "scoreRange"
    );


const scoreValue =
    document.getElementById(
        "scoreValue"
    );


const submitRating =
    document.getElementById(
        "submitRating"
    );


// 当前正在评分的球员

let selectedPlayerId = null;


// ============================================================
// 4. 当前用户信息
// ============================================================

currentUserName.textContent =
    loginUser.name || "用户";


currentUserAvatar.textContent =
    getInitial(
        loginUser.name
    );


// ============================================================
// 5. 评论相关状态
// ============================================================

// 当前展开评论的球员

const expandedComments =
    new Set();


// ============================================================
// 6. 加载排行榜
// ============================================================

async function loadRanking() {

    console.log(
        "开始加载排行榜..."
    );


    loading.style.display =
        "flex";


    loading.innerHTML = `
        <div class="loading-spinner"></div>

        <p>
            正在加载球员数据...
        </p>
    `;


    rankingList.innerHTML = "";


    refreshButton.disabled =
        true;


    try {

        // ====================================================
        // 获取排行榜
        // ====================================================

        const {
            data,
            error
        } =
            await supabaseClient
                .rpc(
                    "get_player_ranking"
                );


        // ====================================================
        // 数据库错误
        // ====================================================

        if (error) {

            console.error(
                "排行榜错误:",
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
            "排行榜数据:",
            data
        );


        loading.style.display =
            "none";


        // ====================================================
        // 没有用户
        // ====================================================

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


        // ====================================================
        // 用户数量
        // ====================================================

        playerCount.textContent =
            data.length;


        // ====================================================
        // 创建球员
        // ====================================================

        for (
            let index = 0;
            index < data.length;
            index++
        ) {

            await createPlayer(
                data[index],
                index
            );

        }


    } catch (error) {

        console.error(
            "排行榜系统错误:",
            error
        );


        loading.style.display =
            "flex";


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


// ============================================================
// 7. 创建球员排行榜项目
// ============================================================

async function createPlayer(
    player,
    index
) {

    const element =
        document.createElement(
            "div"
        );


    element.className =
        "player";


    // ========================================================
    // 是否本人
    // ========================================================

    const isSelf =
        Number(player.id) ===
        Number(loginUser.id);


    // ========================================================
    // 评分人数
    // ========================================================

    const ratingCount =
        Number(
            player.rating_count || 0
        );


    // ========================================================
    // 平均分
    // ========================================================

    const averageScore =
        player.average_score === null ||
        player.average_score === undefined
            ? null
            : Number(
                player.average_score
            );


    // ========================================================
    // 分数 HTML
    // ========================================================

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


    // ========================================================
    // 操作 HTML
    // ========================================================

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


    // ========================================================
    // 球员基本 HTML
    // ========================================================

    element.innerHTML = `

        <div class="rank">

            #${index + 1}

        </div>


        <div class="player-info">

            <div class="avatar">

                ${escapeHTML(
        getInitial(player.name)
    )}

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


        <!-- =================================================
             评论区域
        ================================================== -->

        <div class="comments-section">

            <div class="comments-header">

                <span>
                    💬 评论
                </span>

            </div>


            <div
                class="comments-list"
                data-player-id="${player.id}">

                <div class="comments-loading">

                    正在加载评论...

                </div>

            </div>


            <div class="comment-action">

                ${
        isSelf
            ? `
                            <div class="comment-self-label">
                                不能评论自己
                            </div>
                          `
            : `
                            <button
                                type="button"
                                class="comment-button"
                                data-comment-player-id="${player.id}">

                                💬 发表评论

                            </button>
                          `
    }

            </div>

        </div>

    `;


    rankingList.appendChild(
        element
    );


    // ========================================================
    // 绑定评分按钮
    // ========================================================

    if (!isSelf) {

        const button =
            element.querySelector(
                ".rate-button"
            );


        if (button) {

            button.addEventListener(
                "click",
                function () {

                    openRatingModal(
                        Number(player.id),
                        player.name
                    );

                }
            );

        }

    }


    // ========================================================
    // 绑定评论按钮
    // ========================================================

    if (!isSelf) {

        const commentButton =
            element.querySelector(
                ".comment-button"
            );


        if (commentButton) {

            commentButton.addEventListener(
                "click",
                function () {

                    openCommentInput(
                        element,
                        Number(player.id),
                        player.name
                    );

                }
            );

        }

    }


    // ========================================================
    // 加载评论
    // ========================================================

    await loadPlayerComments(
        element,
        Number(player.id)
    );

}


// ============================================================
// 8. 加载某个球员的评论
// ============================================================

async function loadPlayerComments(
    playerElement,
    playerId
) {

    const commentsList =
        playerElement.querySelector(
            ".comments-list"
        );


    if (!commentsList) {

        return;

    }


    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .rpc(
                    "get_player_comments",
                    {
                        target_player:
                        playerId
                    }
                );


        // ====================================================
        // 查询错误
        // ====================================================

        if (error) {

            console.error(
                "评论加载失败:",
                error
            );


            commentsList.innerHTML = `

                <div class="comments-empty">

                    评论加载失败

                </div>

            `;


            return;

        }


        console.log(
            "球员评论:",
            playerId,
            data
        );


        // ====================================================
        // 没有评论
        // ====================================================

        if (
            !data ||
            data.length === 0
        ) {

            commentsList.innerHTML = `

                <div class="comments-empty">

                    暂时还没有评论

                </div>

            `;


            return;

        }


        // ====================================================
        // 是否展开全部
        // ====================================================

        const isExpanded =
            expandedComments.has(
                playerId
            );


        // ====================================================
        // 默认只显示第一条
        // ====================================================

        const visibleComments =
            isExpanded
                ? data
                : data.slice(
                    0,
                    1
                );


        // ====================================================
        // 生成评论
        // ====================================================

        commentsList.innerHTML =
            visibleComments
                .map(
                    comment =>
                        createCommentHTML(
                            comment
                        )
                )
                .join("");


        // ====================================================
        // 有多条评论
        // ====================================================

        if (
            data.length > 1
        ) {

            const toggleButton =
                document.createElement(
                    "button"
                );


            toggleButton.type =
                "button";


            toggleButton.className =
                "comments-toggle";


            toggleButton.textContent =
                isExpanded
                    ? "收起评论"
                    : `查看全部 ${data.length} 条评论`;


            toggleButton.addEventListener(
                "click",
                async function () {

                    if (
                        expandedComments.has(
                            playerId
                        )
                    ) {

                        expandedComments.delete(
                            playerId
                        );

                    } else {

                        expandedComments.add(
                            playerId
                        );

                    }


                    await loadPlayerComments(
                        playerElement,
                        playerId
                    );

                }
            );


            commentsList.appendChild(
                toggleButton
            );

        }


    } catch (error) {

        console.error(
            "评论系统错误:",
            error
        );


        commentsList.innerHTML = `

            <div class="comments-empty">

                评论加载失败

            </div>

        `;

    }

}


// ============================================================
// 9. 创建评论 HTML
// ============================================================

function createCommentHTML(
    comment
) {

    const name =
        comment.user_name ||
        comment.name ||
        "用户";


    const content =
        comment.comment ||
        comment.content ||
        comment.text ||
        "";


    return `

        <div class="comment-item">

            <div class="comment-avatar">

                ${escapeHTML(
        getInitial(name)
    )}

            </div>


            <div class="comment-body">

                <div class="comment-top">

                    <span class="comment-user">

                        ${escapeHTML(
        name
    )}

                    </span>

                </div>


                <div class="comment-content">

                    ${escapeHTML(
        content
    )}

                </div>

            </div>

        </div>

    `;

}


// ============================================================
// 10. 打开评论输入框
// ============================================================

function openCommentInput(
    playerElement,
    playerId,
    playerName
) {

    // ========================================================
    // 如果已经存在输入框
    // ========================================================

    const oldInput =
        playerElement.querySelector(
            ".comment-form"
        );


    if (oldInput) {

        oldInput.remove();

        return;

    }


    const commentAction =
        playerElement.querySelector(
            ".comment-action"
        );


    if (!commentAction) {

        return;

    }


    // ========================================================
    // 创建输入框
    // ========================================================

    const form =
        document.createElement(
            "div"
        );


    form.className =
        "comment-form";


    form.innerHTML = `

        <textarea
            class="comment-input"
            maxlength="200"
            placeholder="请输入你对 ${escapeHTML(playerName)} 的评价..."
        ></textarea>


        <div class="comment-form-bottom">

            <span class="comment-limit">

                最多200字

            </span>


            <div class="comment-form-buttons">

                <button
                    type="button"
                    class="comment-cancel">

                    取消

                </button>


                <button
                    type="button"
                    class="comment-submit">

                    发布评论

                </button>

            </div>

        </div>

    `;


    commentAction.appendChild(
        form
    );


    // ========================================================
    // 输入框
    // ========================================================

    const textarea =
        form.querySelector(
            ".comment-input"
        );


    textarea.focus();


    // ========================================================
    // 取消
    // ========================================================

    const cancelButton =
        form.querySelector(
            ".comment-cancel"
        );


    cancelButton.addEventListener(
        "click",
        function () {

            form.remove();

        }
    );


    // ========================================================
    // 提交
    // ========================================================

    const submitButton =
        form.querySelector(
            ".comment-submit"
        );


    submitButton.addEventListener(
        "click",
        async function () {

            await submitComment(
                form,
                playerElement,
                playerId,
                playerName
            );

        }
    );


    // ========================================================
    // Ctrl + Enter 发布
    // ========================================================

    textarea.addEventListener(
        "keydown",
        function (event) {

            if (
                event.ctrlKey &&
                event.key === "Enter"
            ) {

                event.preventDefault();


                submitComment(
                    form,
                    playerElement,
                    playerId,
                    playerName
                );

            }

        }
    );

}


// ============================================================
// 11. 提交评论
// ============================================================

async function submitComment(
    form,
    playerElement,
    playerId,
    playerName
) {

    const textarea =
        form.querySelector(
            ".comment-input"
        );


    const submitButton =
        form.querySelector(
            ".comment-submit"
        );


    if (!textarea) {

        return;

    }


    // ========================================================
    // 获取内容
    // ========================================================

    const content =
        textarea.value.trim();


    // ========================================================
    // 内容验证
    // ========================================================

    if (!content) {

        alert(
            "请输入评论内容"
        );

        textarea.focus();

        return;

    }


    if (
        content.length > 200
    ) {

        alert(
            "评论不能超过200字"
        );

        return;

    }


    // ========================================================
    // 不能评论自己
    // ========================================================

    if (
        Number(loginUser.id) ===
        Number(playerId)
    ) {

        alert(
            "不能评论自己"
        );

        return;

    }


    // ========================================================
    // 禁止重复提交
    // ========================================================

    submitButton.disabled =
        true;


    submitButton.textContent =
        "发布中...";


    try {

        console.log(
            "准备提交评论:",
            {
                user:
                loginUser.id,

                target:
                playerId,

                content:
                content
            }
        );


        // ====================================================
        // 调用 Supabase RPC
        // ====================================================

        const {
            data,
            error
        } =
            await supabaseClient
                .rpc(
                    "add_player_comment",
                    {

                        rater:
                            Number(
                                loginUser.id
                            ),

                        target:
                            Number(
                                playerId
                            ),

                        comment_text:
                        content

                    }
                );


        // ====================================================
        // 数据库错误
        // ====================================================

        if (error) {

            console.error(
                "评论提交失败:",
                error
            );


            alert(
                "评论失败：\n" +
                error.message
            );


            return;

        }


        console.log(
            "评论提交成功:",
            data
        );


        // ====================================================
        // 删除输入框
        // ====================================================

        form.remove();


        // ====================================================
        // 评论默认恢复到收起状态
        // ====================================================

        expandedComments.delete(
            playerId
        );


        // ====================================================
        // 重新加载评论
        // ====================================================

        await loadPlayerComments(
            playerElement,
            playerId
        );


    } catch (error) {

        console.error(
            "评论系统错误:",
            error
        );


        alert(
            "网络连接失败，请稍后再试"
        );


    } finally {

        submitButton.disabled =
            false;


        submitButton.textContent =
            "发布评论";

    }

}


// ============================================================
// 12. 打开评分弹窗
// ============================================================

function openRatingModal(
    playerId,
    playerName
) {

    console.log(
        "打开评分窗口:",
        playerId,
        playerName
    );


    selectedPlayerId =
        playerId;


    ratingPlayerName.textContent =
        playerName;


    // ========================================================
    // 默认5分
    // ========================================================

    scoreRange.min =
        "0";


    scoreRange.max =
        "5";


    scoreRange.step =
        "1";


    scoreRange.value =
        "5";


    scoreValue.textContent =
        "5";


    ratingModal.classList.add(
        "show"
    );

}


// ============================================================
// 13. 关闭评分弹窗
// ============================================================

function closeRatingModal() {

    ratingModal.classList.remove(
        "show"
    );


    selectedPlayerId =
        null;

}


closeModal.addEventListener(
    "click",
    closeRatingModal
);


// ============================================================
// 14. 点击背景关闭
// ============================================================

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


// ============================================================
// 15. ESC关闭
// ============================================================

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


// ============================================================
// 16. 评分滑块
// ============================================================

scoreRange.addEventListener(
    "input",
    function () {

        let score =
            Number(
                scoreRange.value
            );


        // ====================================================
        // 强制整数
        // ====================================================

        score =
            Math.round(score);


        // ====================================================
        // 限制0～5
        // ====================================================

        if (score < 0) {

            score = 0;

        }


        if (score > 5) {

            score = 5;

        }


        scoreRange.value =
            score;


        scoreValue.textContent =
            score;

    }
);


// ============================================================
// 17. 提交评分
// ============================================================

submitRating.addEventListener(
    "click",
    async function () {

        // ====================================================
        // 没有选择球员
        // ====================================================

        if (
            selectedPlayerId === null
        ) {

            return;

        }


        // ====================================================
        // 获取评分
        // ====================================================

        let score =
            Number(
                scoreRange.value
            );


        // ====================================================
        // 强制整数
        // ====================================================

        score =
            Math.round(score);


        // ====================================================
        // 评分范围验证
        // ====================================================

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


        // ====================================================
        // 防止自己给自己评分
        // ====================================================

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


        console.log(
            "准备提交评分:",
            {
                rater:
                loginUser.id,

                target:
                selectedPlayerId,

                score:
                score
            }
        );


        // ====================================================
        // 按钮状态
        // ====================================================

        submitRating.disabled =
            true;


        submitRating.textContent =
            "提交中...";


        try {

            // =================================================
            // 调用数据库评分函数
            // =================================================

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


            // =================================================
            // 数据库错误
            // =================================================

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


            // =================================================
            // 关闭弹窗
            // =================================================

            closeRatingModal();


            // =================================================
            // 刷新排行榜
            // =================================================

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

            submitRating.disabled =
                false;


            submitRating.textContent =
                "提交评分";

        }

    }
);


// ============================================================
// 18. 刷新排行榜
// ============================================================

refreshButton.addEventListener(
    "click",
    function () {

        loadRanking();

    }
);


// ============================================================
// 19. 退出登录
// ============================================================

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


// ============================================================
// 20. 获取头像首字母
// ============================================================

function getInitial(
    name
) {

    if (!name) {

        return "?";

    }


    return String(name)
        .trim()
        .charAt(0)
        .toUpperCase();

}


// ============================================================
// 21. HTML 转义
// ============================================================

function escapeHTML(
    text
) {

    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        text === null ||
        text === undefined
            ? ""
            : String(text);


    return div.innerHTML;

}


// ============================================================
// 22. 启动
// ============================================================

loadRanking();
