/**     Сервис по чтению всех связей между всеми БО
 *      Написан : Ведухин Е.В.
 *      по подобию функции getConnections
 *      из библиотеки \common_xsjs\external\lib.xsjslib
 *
 */

var conn = $.db.getConnection();


switch ($.request.method) {
    case $.net.http.GET:
        var sInfoModelCode = $.request.parameters.get("infomodel"); //BRT;
        get();
        $.response.status = $.net.http.OK;
        break;
    case $.net.http.POST:
//        post();
        $.response.status = $.net.http.OK;
        break;
    case $.net.http.DEL:
        var sIds = $.request.parameters.get("ids");
        del(sIds);
        $.response.status = $.net.http.OK;
        break;
}


/*  Взять для просмотра все связи между всеми БО    */
function get() {

    var pstmt = conn.prepareStatement(
    "SELECT string_agg(l.ID_LINK, ',') as IDS, " +
    "   MAX(c1.NAME_CARD) bo1, MAX(c2.NAME_CARD) bo2, " +
    "   l.ID_CARD_1 || ':' || l.version_card_1 bo1id, l.ID_CARD_2 || ':' || l.version_card_2 bo2id, " +
    "   MAX(l.TYPE_JOIN) as TYPE_JOIN, " +
    "   string_agg(m1.name, ',') as ATTRS1, " +
    "   string_agg(m2.name, ',') as ATTRS2, " +
    "   MAX(l.DESCRIPTION) as DESCRIPTION " +
    "FROM Z_BOBJ_REPO.T_LINK_TMP l, " +
    "   Z_BOBJ_REPO.T_ATTRIBUTE m1, " +
    "   Z_BOBJ_REPO.T_ATTRIBUTE m2, " +
    "   Z_BOBJ_REPO.T_CARD c1, " +
    "   Z_BOBJ_REPO.T_CARD c2 " +
    "WHERE  " +
    "   l.is_active = TRUE  " +
    "   AND l.ID_ATTRIBUTE_1 = m1.ID_ATTRIBUTE  " +
    "   AND l.ID_ATTRIBUTE_2 = m2.ID_ATTRIBUTE  " +
    "   AND c1.ID_CARD=l.ID_CARD_1 " +
    "   AND c2.ID_CARD=l.ID_CARD_2 " +
    "   AND c1.IAS_ID = ( " +
    "       select ID_IAS "+
    "       from Z_BOBJ_REPO.T_IAS "+
    "       where CODE_VALUE = ? "+
    "   ) " +
    "GROUP BY  l.ID_CARD_1 || ':' || l.version_card_1, l.ID_CARD_2 || ':' || l.version_card_2 "
    );

    pstmt.setNString(1, sInfoModelCode);
    var result = pstmt.executeQuery();

    var out = [];
    while (result.next()) {
        out.push({
            "ids" : result.getNString(1),
            "bo1": result.getNString(2),
            "bo2": result.getNString(3),
            "bo1id": result.getNString(4),
            "bo2id": result.getNString(5),
            "type": result.getNString(6),
            "atr1": result.getNString(7),
            "atr2": result.getNString(8),
            "description": result.getNString(9)
        });
    }

    $.response.status = $.net.http.OK;
    $.response.setBody(JSON.stringify(out));
    $.response.contentType = "application/json";

}


/*  Удалить все связи между всеми БО
    параметр - id всех связей через запятую     */
function del(strID) {
    let pstmt = conn.prepareStatement(
        "delete " +
        "from Z_BOBJ_REPO.T_LINK_TMP " +
        "where ID_LINK in (" + strID + ")"
    );
    pstmt.execute();
    conn.commit();
}
