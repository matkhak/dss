/**     Чтение/запись связей между БО
 *
 */


var conn = $.db.getConnection();

var iIDCard1 = parseInt($.request.parameters.get("idcard1"));
var iIDCard2 = parseInt($.request.parameters.get("idcard2"));
var iVerCard1 = parseInt($.request.parameters.get("vercard1"));
var iVerCard2 = parseInt($.request.parameters.get("vercard2"));
var sTypeJoin;
var oAttrs;

switch ($.request.method) {
    case $.net.http.GET:
        get();
        $.response.status = $.net.http.OK;
        break;
    case $.net.http.POST:
        sTypeJoin = $.request.parameters.get("type").toString();
        oAttrs = JSON.parse($.request.parameters.get("attrs"));
        post();
        $.response.status = $.net.http.OK;
        break;
}

function get() {

    var out = {};

    var pstmt = conn.prepareStatement(
        "select ID_ATTRIBUTE_1, ID_ATTRIBUTE_2, TYPE_JOIN  " +
        "from Z_BOBJ_REPO.T_LINK_TMP " +
        "where ID_CARD_1 = ? and VERSION_CARD_1 = ? and ID_CARD_2 = ? and VERSION_CARD_2 = ? " +
        "and VERSION_LINK = 1 " +
        "and IS_ACTIVE = true "
    );
    pstmt.setInteger(1, iIDCard1);
    pstmt.setInteger(2, iVerCard1);
    pstmt.setInteger(3, iIDCard2);
    pstmt.setInteger(4, iVerCard2);

    var result = pstmt.executeQuery();
    var mAtrs = [];
    var sType = "";
    while (result.next()) {
        sType = result.getNString(3);
        mAtrs.push({
            "left": result.getInteger(1),
            "right": result.getInteger(2)
        });
    }
    out = {
        "type": sType,
        "atrs": mAtrs
    };

    $.response.status = $.net.http.OK;
    $.response.setBody(JSON.stringify(out));
    $.response.contentType = "application/json";
}

function post() {

    /*  Сначала все записи удалим   */
    var pstmt = conn.prepareStatement("DELETE FROM Z_BOBJ_REPO.T_LINK_TMP " +
        "WHERE VERSION_LINK=1 and IS_ACTIVE=true and ID_CARD_1 = ? and VERSION_CARD_1 = ? and ID_CARD_2 = ? and VERSION_CARD_2 = ? "
    );
    pstmt.setBigInt(1, iIDCard1);
    pstmt.setInteger(2, iVerCard1);
    pstmt.setBigInt(3, iIDCard2);
    pstmt.setInteger(4, iVerCard2);
    pstmt.execute();


    /*  а теперь их добавим */
    pstmt = conn.prepareStatement(
        "INSERT into Z_BOBJ_REPO.T_LINK_TMP " +
        "(ID_LINK, VERSION_LINK, ID_CARD_1, VERSION_CARD_1, ID_CARD_2, VERSION_CARD_2, ID_ATTRIBUTE_1, ID_ATTRIBUTE_2, TYPE_JOIN, IS_ACTIVE) " +
        "values(Z_BOBJ_REPO.SQ_T_LINK.NEXTVAL, 1, ?, ?, ?, ?, ?, ?, ?, true)"
    );


    for (let i = 0; i < oAttrs.length; i++) {
        pstmt.setBigInt(1, iIDCard1);
        pstmt.setInteger(2, iVerCard1);
        pstmt.setBigInt(3, iIDCard2);
        pstmt.setInteger(4, iVerCard2);

        let iAtr1 = oAttrs[i].left;
        let iAtr2 = oAttrs[i].right;
        pstmt.setBigInt(5, iAtr1);
        pstmt.setBigInt(6, iAtr2);
        pstmt.setString(7, sTypeJoin);
        pstmt.execute();
    }

    conn.commit();

}
