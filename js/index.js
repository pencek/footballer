// ============================================================
// Footballer - 球员排行榜
// 完整 JS
//
// 功能：
// 1. 登录检查
// 2. 获取球员排行榜
// 3. 评分 0~5 整数
// 4. 不能给自己评分
// 5. 评分时填写评论
// 6. 评论最多200字
// 7. 评分 + 评论一起提交
// 8. 每个球员显示评论
// 9. 默认显示一条评论
// 10. 查看全部评论
// 11. 删除自己的评论
// 12. 评论每天北京时间04:00刷新
// ============================================================


// ============================================================
// 检查登录状态
// ============================================================

const loginUserData =
    localStorage.getItem("loginUser");


if (!loginUserData) {

    window.location.href =
        "login.html";

    throw new Error(
        "用户未登录"
    );

}


let loginUser;


try {

    loginUser =
        JSON.parse(loginUserData);

} catch (error) {

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
// 获取页面元素
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
// 评分弹窗
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


// ============================================================
// 评论
// ============================================================

const commentInput =
    document.getElementById(
        "commentInput"
    );


const commentLimit =
    document.querySelector(
        ".comment-limit"
    );


// ============================================================
// 当前正在评分的球员
// ============================================================

let selectedPlayerId =
    null;


// ============================================================
// 评论展开状态
// ============================================================

const expandedComments =
    new Set();


// ============================================================
// 当前用户信息
// ============================================================

currentUserName.textContent =
    loginUser.name || "用户";


currentUserAvatar.textContent =
    getInitial(
        loginUser.name
    );


// ============================================================
// 加载排行榜
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


    rankingList.innerHTML =
        "";


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
                "排行榜错误：",
                error
            );


            loading.innerHTML = `

                <p style="
                    color:#ff6b6b;
                ">
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
            "排行榜系统错误：",
            error
        );


        loading.innerHTML = `

            <p style="
                color:#ff6b6b;
            ">
                网络连接失败，请稍后再试
            </p>

        `;


    } finally {

        refreshButton.disabled =
            false;

    }

}


// ============================================================
// 创建球员
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
    // 分数
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
    // 操作
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
    // 球员主体
    // ========================================================

    element.innerHTML = `

        <div class="player-main">


            <!-- 排名 -->

            <div class="rank">

                #${index + 1}

            </div>


            <!-- 球员 -->

            <div class="player-info">

                <div class="avatar">

                    ${getInitial(
        player.name
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


            <!-- 平均分 -->

            <div class="score">

                ${scoreHTML}

                <div class="score-label">

                    平均评分

                </div>

            </div>


            <!-- 操作 -->

            <div class="player-action">

                <div class="rating-count">

                    ${ratingCount} 人评分

                </div>

                ${actionHTML}

            </div>


        </div>


        <!-- =================================================
             评论区域
        ================================================== -->

        <div
            class="player-comments"
            data-player-id="${player.id}">

            <div class="comments-header">

                <div class="comments-title">

                    <span class="comments-title-icon">
                        💬
                    </span>

                    <span>
                        球员评价
                    </span>

                </div>

                <span class="comments-count">
                    加载中...
                </span>

            </div>


            <div class="comments-list">

                <div class="comments-loading">
                    正在加载评论...
                </div>

            </div>

        </div>

    `;


    rankingList.appendChild(
        element
    );


    // ========================================================
    // 评分按钮
    // ========================================================

    if (!isSelf) {

        const button =
            element.querySelector(
                ".rate-button"
            );


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


    // ========================================================
    // 加载评论
    // ========================================================

    await loadComments(
        Number(player.id),
        element
    );

}


// ============================================================
// 加载评论
// ============================================================

async function loadComments(
    playerId,
    playerElement
) {

    const commentsContainer =
        playerElement.querySelector(
            ".player-comments"
        );


    const commentsList =
        commentsContainer.querySelector(
            ".comments-list"
        );


    const commentsCount =
        commentsContainer.querySelector(
            ".comments-count"
        );


    commentsList.innerHTML = `

        <div class="comments-loading">

            正在加载评论...

        </div>

    `;


    try {

        // ====================================================
        // 调用数据库评论函数
        // ====================================================

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


        if (error) {

            console.error(
                "评论加载失败:",
                error
            );


            commentsCount.textContent =
                "加载失败";


            commentsList.innerHTML = `

                <div class="no-comments">

                    评论暂时无法加载

                </div>

            `;

            return;

        }


        const comments =
            Array.isArray(data)
                ? data
                : [];


        // ====================================================
        // 评论数量
        // ====================================================

        commentsCount.textContent =
            `${comments.length} 条`;


        // ====================================================
        // 没有评论
        // ====================================================

        if (
            comments.length === 0
        ) {

            commentsList.innerHTML = `

                <div class="no-comments">

                    暂时还没有评论

                </div>

            `;

            return;

        }


        // ====================================================
        // 排序
        // 最新在前
        // ====================================================

        comments.sort(
            function(a, b) {

                return (
                    new Date(
                        b.created_at
                    ) -
                    new Date(
                        a.created_at
                    )
                );

            }
        );


        const isExpanded =
            expandedComments.has(
                playerId
            );


        // ====================================================
        // 默认只显示一条
        // ====================================================

        const displayComments =
            isExpanded
                ? comments
                : comments.slice(
                    0,
                    1
                );


        commentsList.innerHTML =
            "";


        displayComments.forEach(
            function(
                comment,
                index
            ) {

                commentsList.appendChild(
                    createCommentElement(
                        comment,
                        index === 0
                    )
                );

            }
        );


        // ====================================================
        // 查看全部 / 收起
        // ====================================================

        if (
            comments.length > 1
        ) {

            const button =
                document.createElement(
                    "button"
                );


            button.type =
                "button";


            button.className =
                "show-comments-button";


            if (isExpanded) {

                button.textContent =
                    "收起评论";

            } else {

                button.textContent =
                    `查看全部 ${comments.length} 条评论`;

            }


            button.addEventListener(
                "click",
                async function() {

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


                    await loadComments(
                        playerId,
                        playerElement
                    );

                }
            );


            commentsList.appendChild(
                button
            );

        }


    } catch (error) {

        console.error(
            "评论系统错误:",
            error
        );


        commentsCount.textContent =
            "加载失败";


        commentsList.innerHTML = `

            <div class="no-comments">

                评论加载失败

            </div>

        `;

    }

}


// ============================================================
// 创建评论元素
// ============================================================

function createCommentElement(
    comment,
    isLatest
) {

    const element =
        document.createElement(
            "div"
        );


    element.className =
        "comment-item";


    if (isLatest) {

        element.classList.add(
            "latest"
        );

    }


    const userId =
        comment.user_id ??
        comment.rater_id ??
        comment.author_id;


    const userName =
        comment.user_name ||
        comment.name ||
        comment.username ||
        "用户";


    const content =
        comment.content ||
        comment.comment_text ||
        "";


    const createdAt =
        comment.created_at;


    const isMine =
        Number(userId) ===
        Number(loginUser.id);


    element.innerHTML = `

        <div class="comment-top">


            <div class="comment-avatar">

                ${getInitial(
        userName
    )}

            </div>


            <div class="comment-user">

                ${escapeHTML(
        userName
    )}

            </div>


            <div class="comment-time">

                ${formatTime(
        createdAt
    )}

            </div>


        </div>


        <div class="comment-content">

            ${escapeHTML(
        content
    )}

        </div>


        ${
        isMine
            ? `

                    <div class="comment-actions">

                        <button
                            type="button"
                            class="comment-delete">

                            删除

                        </button>

                    </div>

                `
            : ""
    }

    `;


    // ========================================================
    // 删除自己的评论
    // ========================================================

    if (isMine) {

        const deleteButton =
            element.querySelector(
                ".comment-delete"
            );


        deleteButton.addEventListener(
            "click",
            async function() {

                await deleteComment(
                    comment.id
                );

            }
        );

    }


    return element;

}


// ============================================================
// 删除评论
// ============================================================

async function deleteComment(
    commentId
) {

    if (!commentId) {

        return;

    }


    const confirmDelete =
        confirm(
            "确定要删除这条评论吗？"
        );


    if (!confirmDelete) {

        return;

    }


    try {

        const {
            error
        } =
            await supabaseClient
                .rpc(
                    "delete_player_comment",
                    {
                        comment_id:
                        commentId,

                        delete_user:
                            Number(
                                loginUser.id
                            )
                    }
                );


        if (error) {

            console.error(
                "删除评论失败:",
                error
            );


            alert(
                "删除失败：\n" +
                error.message
            );


            return;

        }


        await loadRanking();


    } catch (error) {

        console.error(
            "删除评论系统错误:",
            error
        );


        alert(
            "网络连接失败，请稍后再试"
        );

    }

}


// ============================================================
// 打开评分弹窗
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

    scoreRange.value =
        "5";


    scoreValue.textContent =
        "5";


    // ========================================================
    // 清空评论
    // ========================================================

    commentInput.value =
        "";


    updateCommentCount();


    // ========================================================
    // 打开
    // ========================================================

    ratingModal.classList.add(
        "show"
    );


    // 自动聚焦评论
    setTimeout(
        function() {

            commentInput.focus();

        },
        150
    );

}


// ============================================================
// 关闭评分弹窗
// ============================================================

function closeRatingModal() {

    ratingModal.classList.remove(
        "show"
    );


    selectedPlayerId =
        null;


    commentInput.value =
        "";


    updateCommentCount();

}


closeModal.addEventListener(
    "click",
    closeRatingModal
);


// ============================================================
// 点击背景关闭
// ============================================================

ratingModal.addEventListener(
    "click",
    function(event) {

        if (
            event.target ===
            ratingModal
        ) {

            closeRatingModal();

        }

    }
);


// ============================================================
// ESC关闭
// ============================================================

document.addEventListener(
    "keydown",
    function(event) {

        if (
            event.key === "Escape" &&
            ratingModal.classList.contains(
                "show"
            )
        ) {

            closeRatingModal();

        }

    }
);


// ============================================================
// 评分滑块
// ============================================================

scoreRange.addEventListener(
    "input",
    function() {

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
        // 限制0~5
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
// 评论字数
// ============================================================

commentInput.addEventListener(
    "input",
    function() {

        updateCommentCount();

    }
);


// ============================================================
// 更新评论字数
// ============================================================

function updateCommentCount() {

    const length =
        commentInput.value.length;


    commentLimit.textContent =
        `${length} / 200`;


    if (
        length >= 180
    ) {

        commentLimit.style.color =
            "#ffb84d";

    } else {

        commentLimit.style.color =
            "#536158";

    }

}


// ============================================================
// 提交评分 + 评论
// ============================================================

submitRating.addEventListener(
    "click",
    async function() {

        // ====================================================
        // 检查目标球员
        // ====================================================

        if (
            selectedPlayerId === null
        ) {

            return;

        }


        // ====================================================
        // 获取评分
        // ====================================================

        const score =
            Number(
                scoreRange.value
            );


        // ====================================================
        // 获取评论
        // ====================================================

        const comment =
            commentInput.value.trim();


        // ====================================================
        // 评分验证
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
        // 评论长度验证
        // ====================================================

        if (
            comment.length > 200
        ) {

            alert(
                "评论不能超过200字"
            );

            return;

        }


        // ====================================================
        // 不能给自己评分
        // ====================================================

        if (
            Number(loginUser.id) ===
            Number(selectedPlayerId)
        ) {

            alert(
                "不能给自己评分和评论"
            );


            closeRatingModal();


            return;

        }


        // ====================================================
        // 防止重复点击
        // ====================================================

        submitRating.disabled =
            true;


        submitRating.textContent =
            "提交中...";


        try {

            console.log(
                "准备提交评分和评论:",
                {
                    rater:
                    loginUser.id,

                    target:
                    selectedPlayerId,

                    score:
                    score,

                    comment:
                    comment
                }
            );


            // =================================================
            // 调用数据库函数
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
                            score,

                            comment_text:
                            comment

                        }
                    );


            // =================================================
            // 数据库错误
            // =================================================

            if (error) {

                console.error(
                    "评分/评论失败:",
                    error
                );


                // 重复评分
                if (
                    error.message &&
                    (
                        error.message.includes(
                            "already"
                        ) ||
                        error.message.includes(
                            "duplicate"
                        ) ||
                        error.message.includes(
                            "重复"
                        )
                    )
                ) {

                    alert(
                        "你今天已经评价过这名球员了"
                    );

                } else {

                    alert(
                        "提交失败：\n" +
                        error.message
                    );

                }


                return;

            }


            console.log(
                "评分和评论成功:",
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
                "提交评分和评论";

        }

    }
);


// ============================================================
// 刷新排行榜
// ============================================================

refreshButton.addEventListener(
    "click",
    async function() {

        await loadRanking();

    }
);


// ============================================================
// 退出登录
// ============================================================

logoutButton.addEventListener(
    "click",
    function() {

        localStorage.removeItem(
            "loginUser"
        );


        window.location.href =
            "login.html";

    }
);


// ============================================================
// 获取头像文字
// ============================================================

function getInitial(name) {

    if (!name) {

        return "?";

    }


    return String(name)
        .trim()
        .charAt(0)
        .toUpperCase();

}


// ============================================================
// 防止 HTML 注入
// ============================================================

function escapeHTML(text) {

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
// 格式化评论时间
// ============================================================

function formatTime(
    time
) {

    if (!time) {

        return "";

    }


    const date =
        new Date(time);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "";

    }


    const now =
        new Date();


    const diff =
        now.getTime() -
        date.getTime();


    const minute =
        60 * 1000;


    const hour =
        60 * minute;


    const day =
        24 * hour;


    if (
        diff < minute
    ) {

        return "刚刚";

    }


    if (
        diff < hour
    ) {

        return (
            Math.floor(
                diff / minute
            ) +
            "分钟前"
        );

    }


    if (
        diff < day
    ) {

        return (
            Math.floor(
                diff / hour
            ) +
            "小时前"
        );

    }


    return (
        date.getFullYear() +
        "-" +
        String(
            date.getMonth() + 1
        ).padStart(2, "0") +
        "-" +
        String(
            date.getDate()
        ).padStart(2, "0")
    );

}


// ============================================================
// 每天北京时间04:00自动刷新页面数据
//
// 注意：
// 这里是前端刷新。
// 真正的“清空数据”必须由 Supabase 数据库定时任务完成。
// ============================================================

function getNextChinaResetTime() {

    const now =
        new Date();


    // ========================================================
    // 获取当前 UTC 时间
    // ========================================================

    const utcNow =
        now.getTime() +
        now.getTimezoneOffset() *
        60 *
        1000;


    // ========================================================
    // 中国时间 = UTC + 8
    // ========================================================

    const chinaNow =
        new Date(
            utcNow +
            8 *
            60 *
            60 *
            1000
        );


    // ========================================================
    // 今天04:00
    // ========================================================

    const reset =
        new Date(
            chinaNow
        );


    reset.setHours(
        4,
        0,
        0,
        0
    );


    // ========================================================
    // 如果今天04:00已经过去
    // 则计算明天04:00
    // ========================================================

    if (
        chinaNow >= reset
    ) {

        reset.setDate(
            reset.getDate() + 1
        );

    }


    // ========================================================
    // 转回本地时间
    // ========================================================

    const resetUTC =
        reset.getTime() -
        8 *
        60 *
        60 *
        1000;


    return new Date(
        resetUTC -
        now.getTimezoneOffset() *
        60 *
        1000
    );

}


// ============================================================
// 自动刷新计时器
// ============================================================

function scheduleDailyRefresh() {

    const nextReset =
        getNextChinaResetTime();


    const delay =
        nextReset.getTime() -
        Date.now();


    console.log(
        "下一次北京时间04:00刷新:",
        nextReset
    );


    setTimeout(
        async function() {

            console.log(
                "北京时间04:00，刷新排行榜"
            );


            await loadRanking();


            scheduleDailyRefresh();

        },
        Math.max(
            delay,
            1000
        )
    );

}


// ============================================================
// 启动
// ============================================================

updateCommentCount();

loadRanking();

scheduleDailyRefresh();