// ============================================================
// Footballer - 球员排行榜
// 评分 + 评论完整 JS
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
        "登录信息解析失败：",
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
// 2. 检查 Supabase
// ============================================================

if (
    typeof supabaseClient ===
    "undefined"
) {

    console.error(
        "supabaseClient 不存在，请检查 js/supabase.js"
    );

    throw new Error(
        "Supabase 初始化失败"
    );

}


// ============================================================
// 3. 获取页面元素
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
// 4. 评分 + 评论弹窗元素
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


const commentInput =
    document.getElementById(
        "commentInput"
    );


const commentLength =
    document.getElementById(
        "commentLength"
    );


const submitRating =
    document.getElementById(
        "submitRating"
    );


// ============================================================
// 5. 当前正在评分的球员
// ============================================================

let selectedPlayerId = null;


// ============================================================
// 6. 评论缓存
//
// 格式：
//
// commentsByPlayer = {
//
//     1: [
//         {
//             id: 1,
//             target_id: 1,
//             user_id: 2,
//             content: "...",
//             created_at: "..."
//         }
//     ],
//
//     2: [...]
// }
//
// ============================================================

let commentsByPlayer = {};


// ============================================================
// 7. 用户姓名缓存
//
// userNameMap = {
//
//     1: "张三",
//     2: "李四"
//
// }
// ============================================================

let userNameMap = {};


// ============================================================
// 8. 当前展开的评论区
// ============================================================

const expandedComments =
    new Set();


// ============================================================
// 9. 显示当前登录用户
// ============================================================

currentUserName.textContent =
    loginUser.name || "用户";


currentUserAvatar.textContent =
    getInitial(
        loginUser.name
    );


// ============================================================
// 10. 初始化
// ============================================================

async function initializePage() {

    console.log(
        "Footballer 页面初始化..."
    );


    await loadRanking();

}


// ============================================================
// 11. 加载排行榜
// ============================================================

async function loadRanking() {

    console.log(
        "开始加载排行榜..."
    );


    // 显示加载

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
        // 第一步：获取排行榜
        // ====================================================

        const {
            data,
            error
        } =
            await supabaseClient
                .rpc(
                    "get_player_ranking"
                );


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
                    ${escapeHTML(error.message)}
                </p>

            `;

            return;

        }


        console.log(
            "排行榜数据：",
            data
        );


        // ====================================================
        // 第二步：加载评论
        // ====================================================

        await loadComments();


        // ====================================================
        // 隐藏加载
        // ====================================================

        loading.style.display =
            "none";


        // ====================================================
        // 没有球员
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
        // 球员数量
        // ====================================================

        playerCount.textContent =
            data.length;


        // ====================================================
        // 创建球员
        // ====================================================

        data.forEach(
            (
                player,
                index
            ) => {

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


// ============================================================
// 12. 加载所有评论
// ============================================================

async function loadComments() {

    console.log(
        "开始加载评论..."
    );


    commentsByPlayer = {};


    try {

        // ====================================================
        // 获取评论
        // ====================================================

        const {
            data: comments,
            error: commentsError
        } =
            await supabaseClient
                .from("comments")
                .select(
                    `
                    id,
                    target_id,
                    user_id,
                    content,
                    created_at
                    `
                )
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );


        if (commentsError) {

            console.error(
                "评论加载失败：",
                commentsError
            );

            // 评论加载失败不影响排行榜

            commentsByPlayer = {};

            return;

        }


        console.log(
            "评论数据：",
            comments
        );


        // ====================================================
        // 获取用户名称
        // ====================================================

        await loadCommentUserNames(
            comments || []
        );


        // ====================================================
        // 按球员分类
        // ====================================================

        (comments || []).forEach(
            comment => {

                const targetId =
                    Number(
                        comment.target_id
                    );


                if (
                    !commentsByPlayer[
                        targetId
                        ]
                ) {

                    commentsByPlayer[
                        targetId
                        ] = [];

                }


                commentsByPlayer[
                    targetId
                    ].push(
                    comment
                );

            }
        );


    } catch (error) {

        console.error(
            "评论系统加载错误：",
            error
        );


        commentsByPlayer = {};

    }

}


// ============================================================
// 13. 加载评论作者姓名
// ============================================================

async function loadCommentUserNames(
    comments
) {

    userNameMap = {};


    if (
        !comments ||
        comments.length === 0
    ) {

        return;

    }


    // ========================================================
    // 提取所有 user_id
    // ========================================================

    const userIds =
        [
            ...new Set(
                comments.map(
                    comment =>
                        Number(
                            comment.user_id
                        )
                )
            )
        ];


    if (
        userIds.length === 0
    ) {

        return;

    }


    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("user")
                .select(
                    "id,name"
                )
                .in(
                    "id",
                    userIds
                );


        if (error) {

            console.error(
                "评论作者加载失败：",
                error
            );

            return;

        }


        (data || []).forEach(
            user => {

                userNameMap[
                    Number(user.id)
                    ] =
                    user.name ||
                    "用户";

            }
        );


    } catch (error) {

        console.error(
            "获取评论作者异常：",
            error
        );

    }

}


// ============================================================
// 14. 创建球员
// ============================================================

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


    // ========================================================
    // 球员 ID
    // ========================================================

    const playerId =
        Number(player.id);


    // ========================================================
    // 是否本人
    // ========================================================

    const isSelf =
        playerId ===
        Number(loginUser.id);


    // ========================================================
    // 评分人数
    // ========================================================

    const ratingCount =
        Number(
            player.rating_count || 0
        );


    // ========================================================
    // 平均评分
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
        Number.isNaN(
            averageScore
        )
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
                    data-id="${playerId}">

                ⭐ 给TA评分

            </button>

        `;

    }


    // ========================================================
    // 评论区域
    // ========================================================

    const commentsHTML =
        createCommentsSection(
            playerId,
            isSelf
        );


    // ========================================================
    // 整个球员 HTML
    // ========================================================

    element.innerHTML = `

        <!-- =========================
             球员主体
        ========================== -->

        <div class="player-main">


            <div class="rank">

                #${index + 1}

            </div>


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


        </div>


        <!-- =========================
             评论区域
        ========================== -->

        ${commentsHTML}

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
                        playerId,
                        player.name
                    );

                }
            );

        }

    }


    // ========================================================
    // 绑定评论展开按钮
    // ========================================================

    const showCommentsButton =
        element.querySelector(
            ".show-comments-button"
        );


    if (
        showCommentsButton
    ) {

        showCommentsButton.addEventListener(
            "click",
            function () {

                toggleComments(
                    playerId
                );

            }
        );

    }

}


// ============================================================
// 15. 创建评论区域
// ============================================================

function createCommentsSection(
    playerId,
    isSelf
) {

    const comments =
        commentsByPlayer[
            playerId
            ] || [];


    const isExpanded =
        expandedComments.has(
            playerId
        );


    // ========================================================
    // 没有评论
    // ========================================================

    if (
        comments.length === 0
    ) {

        return `

            <div
                    class="player-comments"
                    data-player-id="${playerId}">

                <div class="comments-header">

                    <div class="comments-title">

                        💬 评论

                    </div>

                    <div class="comments-count">

                        0 条评论

                    </div>

                </div>


                <div class="comments-empty">

                    暂时还没有评论

                </div>

            </div>

        `;

    }


    // ========================================================
    // 评论数量
    // ========================================================

    const commentCount =
        comments.length;


    // ========================================================
    // 当前显示评论
    // ========================================================

    const displayComments =
        isExpanded
            ? comments
            : comments.slice(
                0,
                1
            );


    // ========================================================
    // 评论 HTML
    // ========================================================

    let commentsListHTML =
        "";


    displayComments.forEach(
        comment => {

            commentsListHTML +=
                createCommentHTML(
                    comment
                );

        }
    );


    // ========================================================
    // 展开按钮
    // ========================================================

    let showButtonHTML =
        "";


    if (
        commentCount > 1
    ) {

        showButtonHTML = `

            <button
                    type="button"
                    class="show-comments-button">

                ${
            isExpanded
                ? "收起评论"
                : `查看全部 ${commentCount} 条评论`
        }

            </button>

        `;

    }


    return `

        <div
                class="player-comments"
                data-player-id="${playerId}">


            <div class="comments-header">

                <div class="comments-title">

                    💬 评论

                </div>

                <div class="comments-count">

                    ${commentCount} 条评论

                </div>

            </div>


            <div class="comments-list">

                ${commentsListHTML}

            </div>


            ${showButtonHTML}


            ${
        isSelf
            ? `
                        <div class="comment-self-tip">

                            这是你自己，不能评价自己

                        </div>
                    `
            : `
                        <div class="comment-action-tip">

                            ⭐ 评分时可以同时留下评价

                        </div>
                    `
    }


        </div>

    `;

}


// ============================================================
// 16. 创建单条评论
// ============================================================

function createCommentHTML(
    comment
) {

    const userId =
        Number(
            comment.user_id
        );


    const isCurrentUser =
        userId ===
        Number(loginUser.id);


    const userName =
        userNameMap[userId] ||
        (
            isCurrentUser
                ? loginUser.name
                : "用户"
        );


    const initial =
        getInitial(
            userName
        );


    const content =
        escapeHTML(
            comment.content
        );


    const time =
        formatCommentTime(
            comment.created_at
        );


    return `

        <div class="comment-item">


            <div class="comment-avatar">

                ${initial}

            </div>


            <div class="comment-body">


                <div class="comment-top">


                    <span class="comment-user">

                        ${escapeHTML(
        userName
    )}

                        ${
        isCurrentUser
            ? `
                                    <span class="comment-you">
                                        你
                                    </span>
                                  `
            : ""
    }

                    </span>


                    <span class="comment-time">

                        ${time}

                    </span>


                </div>


                <div class="comment-content">

                    ${content}

                </div>


            </div>


        </div>

    `;

}


// ============================================================
// 17. 展开 / 收起评论
// ============================================================

function toggleComments(
    playerId
) {

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


    // ========================================================
    // 重新绘制整个排行榜
    // ========================================================

    redrawRanking();

}


// ============================================================
// 18. 重新绘制排行榜
// ============================================================

async function redrawRanking() {

    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .rpc(
                    "get_player_ranking"
                );


        if (error) {

            console.error(
                "重新绘制排行榜失败：",
                error
            );

            return;

        }


        rankingList.innerHTML =
            "";


        (data || []).forEach(
            (
                player,
                index
            ) => {

                createPlayer(
                    player,
                    index
                );

            }
        );


    } catch (error) {

        console.error(
            "重新绘制排行榜异常：",
            error
        );

    }

}


// ============================================================
// 19. 打开评分 + 评论弹窗
// ============================================================

function openRatingModal(
    playerId,
    playerName
) {

    console.log(
        "打开评价窗口：",
        playerId,
        playerName
    );


    selectedPlayerId =
        Number(playerId);


    ratingPlayerName.textContent =
        playerName;


    // ========================================================
    // 默认 5 分
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


    updateCommentLength();


    // ========================================================
    // 恢复提交按钮
    // ========================================================

    submitRating.disabled =
        false;


    submitRating.innerHTML = `

        <span>
            ⭐
        </span>

        <span>
            提交评分与评论
        </span>

    `;


    // ========================================================
    // 显示弹窗
    // ========================================================

    ratingModal.classList.add(
        "show"
    );


    // ========================================================
    // 自动聚焦评论框
    // ========================================================

    setTimeout(
        () => {

            if (
                commentInput
            ) {

                commentInput.focus();

            }

        },
        150
    );

}


// ============================================================
// 20. 关闭评分弹窗
// ============================================================

function closeRatingModal() {

    ratingModal.classList.remove(
        "show"
    );


    selectedPlayerId =
        null;


    if (commentInput) {

        commentInput.value =
            "";

    }


    updateCommentLength();

}


if (closeModal) {

    closeModal.addEventListener(
        "click",
        closeRatingModal
    );

}


// ============================================================
// 21. 点击背景关闭
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
// 22. ESC 关闭
// ============================================================

document.addEventListener(
    "keydown",
    function (event) {

        if (
            event.key ===
            "Escape"
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
// 23. 评分滑块
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
        // 限制 0～5
        // ====================================================

        if (
            score < 0
        ) {

            score = 0;

        }


        if (
            score > 5
        ) {

            score = 5;

        }


        scoreRange.value =
            score;


        scoreValue.textContent =
            score;

    }
);


// ============================================================
// 24. 评论字数统计
// ============================================================

commentInput.addEventListener(
    "input",
    updateCommentLength
);


// ============================================================
// 25. 更新评论字数
// ============================================================

function updateCommentLength() {

    if (!commentInput) {

        return;

    }


    const length =
        commentInput.value.length;


    commentLength.textContent =
        `${length} / 200`;


    // ========================================================
    // 超过 200
    // ========================================================

    if (
        length >= 200
    ) {

        commentLength.classList.add(
            "limit"
        );

    } else {

        commentLength.classList.remove(
            "limit"
        );

    }

}


// ============================================================
// 26. 提交评分 + 评论
// ============================================================

submitRating.addEventListener(
    "click",
    async function () {

        // ====================================================
        // 检查目标球员
        // ====================================================

        if (
            selectedPlayerId ===
            null
        ) {

            alert(
                "请选择一名球员"
            );

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
            !Number.isInteger(
                score
            ) ||
            score < 0 ||
            score > 5
        ) {

            alert(
                "评分必须是 0～5 的整数"
            );

            return;

        }


        // ====================================================
        // 评论验证
        // ====================================================

        if (
            comment.length === 0
        ) {

            alert(
                "请输入对这名球员的评价"
            );

            commentInput.focus();

            return;

        }


        if (
            comment.length > 200
        ) {

            alert(
                "评论不能超过200字"
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
                "不能评价自己"
            );

            closeRatingModal();

            return;

        }


        console.log(
            "准备提交评分和评论：",
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


        // ====================================================
        // 禁用按钮
        // ====================================================

        submitRating.disabled =
            true;


        submitRating.innerHTML = `

            <span>
                ⏳
            </span>

            <span>
                提交中...
            </span>

        `;


        try {

            // =================================================
            // 第一步：提交评分
            // =================================================

            console.log(
                "正在提交评分..."
            );


            const {
                data: ratingData,
                error: ratingError
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
            // 评分失败
            // =================================================

            if (ratingError) {

                console.error(
                    "评分失败：",
                    ratingError
                );


                alert(
                    "评分失败：\n" +
                    ratingError.message
                );


                return;

            }


            console.log(
                "评分成功：",
                ratingData
            );


            // =================================================
            // 第二步：提交评论
            // =================================================

            console.log(
                "正在提交评论..."
            );


            const {
                data: commentData,
                error: commentError
            } =
                await supabaseClient
                    .from("comments")
                    .upsert(
                        {

                            target_id:
                                Number(
                                    selectedPlayerId
                                ),

                            user_id:
                                Number(
                                    loginUser.id
                                ),

                            content:
                            comment

                        },
                        {

                            onConflict:
                                "user_id,target_id"

                        }
                    )
                    .select();


            // =================================================
            // 评论失败
            // =================================================

            if (commentError) {

                console.error(
                    "评论提交失败：",
                    commentError
                );


                alert(
                    "评分已经提交成功，但评论提交失败：\n" +
                    commentError.message
                );


                // 评分已经成功

                await loadRanking();

                return;

            }


            console.log(
                "评论成功：",
                commentData
            );


            // =================================================
            // 成功
            // =================================================

            alert(
                "评分和评论提交成功！"
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
                "评分评论系统错误：",
                error
            );


            alert(
                "提交失败，请检查网络连接后重试"
            );


        } finally {

            submitRating.disabled =
                false;


            submitRating.innerHTML = `

                <span>
                    ⭐
                </span>

                <span>
                    提交评分与评论
                </span>

            `;

        }

    }
);


// ============================================================
// 27. 刷新排行榜
// ============================================================

refreshButton.addEventListener(
    "click",
    async function () {

        await loadRanking();

    }
);


// ============================================================
// 28. 退出登录
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
// 29. 获取头像首字母
// ============================================================

function getInitial(
    name
) {

    if (
        !name
    ) {

        return "?";

    }


    const text =
        String(name)
            .trim();


    if (
        text.length === 0
    ) {

        return "?";

    }


    return text
        .charAt(0)
        .toUpperCase();

}


// ============================================================
// 30. 防止 HTML 注入
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
// 31. 格式化评论时间
// ============================================================

function formatCommentTime(
    timestamp
) {

    if (
        !timestamp
    ) {

        return "";

    }


    const date =
        new Date(
            timestamp
        );


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


    // ========================================================
    // 一分钟以内
    // ========================================================

    if (
        diff < 60 * 1000
    ) {

        return "刚刚";

    }


    // ========================================================
    // 一小时以内
    // ========================================================

    if (
        diff < 60 * 60 * 1000
    ) {

        return (
            Math.floor(
                diff /
                (60 * 1000)
            ) +
            "分钟前"
        );

    }


    // ========================================================
    // 一天以内
    // ========================================================

    if (
        diff < 24 * 60 * 60 * 1000
    ) {

        return (
            Math.floor(
                diff /
                (60 * 60 * 1000)
            ) +
            "小时前"
        );

    }


    // ========================================================
    // 超过一天
    // ========================================================

    return (
        date.getFullYear() +
        "-" +
        String(
            date.getMonth() + 1
        ).padStart(
            2,
            "0"
        ) +
        "-" +
        String(
            date.getDate()
        ).padStart(
            2,
            "0"
        )
    );

}


// ============================================================
// 32. 页面启动
// ============================================================

initializePage();