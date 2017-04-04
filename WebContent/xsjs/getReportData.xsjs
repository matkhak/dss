/**
 * ******************************************** Возвращает полную инфу о
 * варианте расчета * ********************************************
 * 
 * @param GET
 *            запрос Принимает параметры: id - id карточки version - версия
 * 
 * @return В случае успеха возвращается статус 200
 * 
 * @author Domozhakov_MV@surgutneftegas.ru
 * @author Talipov_MI@surgutneftegas.ru
 */

var conn = $.db.getConnection();
try {
    get();
} catch (e) {
    $.response.setBody(e.toString());
    $.response.status = $.net.http.INTERNAL_SERVER_ERROR;
}

function get() {
    let
    iId = parseInt($.request.parameters.get("reportID"));

    let
    query,  pstmt, rs,  data = [];

    switch (iId) {
    case 1:
        query = "select top 100  "
                + " T1.AUTHOR, T0.NAME, T1.EDIT_DATE, T2.NAME_CARD,T2.VERSION, T2.ID_CARD "
                + " from Z_BOBJ_REPO.T_ATTRIBUTE T0 inner join Z_BOBJ_REPO.T_MAPPING_ATTRIBUTE T1 "
                + " on  T0.ID_ATTRIBUTE = T1.ID_ATTRIBUTE  inner join Z_BOBJ_REPO.T_CARD T2 "
                + " on  T0.ID_CARD = T2.ID_CARD and  T0.VERSION = T2.VERSION "

        
        pstmt = conn.prepareStatement(query);
        // pstmt.setInteger(1, iId);
        
        rs = pstmt.executeQuery();
        
       

        while (rs.next()) {

            data.push({
                sAuthor : rs.getNString(1),
                sNameAttr : rs.getNString(2),
                sDate : rs.getNString(3).substring(0, 19),
                sNameCard : rs.getNString(4),
                iVersion : rs.getInteger(5),
                iCard:  rs.getInteger(6),
                visible: "true"
                

            })

        }
       
        break;
    case 2:
        query = "select T1.AUTHOR, T1.CREATION_DATE  , T0.ID_CARD, T0.VERSION, T0.NAME_CARD "

                + " from Z_BOBJ_REPO.T_HISTORY_STATUS  T1 inner join Z_BOBJ_REPO.T_CARD T0 "
                + " on  T1.ID_OBJECT = T0.ID_CARD and  T1.VERSION = T0.VERSION and T1.STATUS_IS=1 "
                + " order by T0.ID_CARD, T0.VERSION ";

        pstmt = conn.prepareStatement(query);
        // pstmt.setInteger(1, iId);
        rs = pstmt.executeQuery();
        data = [];

        while (rs.next()) {

            data.push({
                sAuthor : rs.getNString(1),
                sDate : rs.getNString(2).substring(0, 19),
                iCard : rs.getInteger(3),
                iVersion : rs.getInteger(4),
                sNameCard : rs.getNString(5),
                visible: "false"

            })

        }

        break;

    }
    $.response.setBody(JSON.stringify(data));
    $.response.contentType = 'application/json';
    $.response.status = $.net.http.OK;

    // conn.commit();
    conn.close();

}
