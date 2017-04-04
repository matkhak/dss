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
    
    switch ($.request.method) {
    
    case $.net.http.DEL:
        del();
        $.response.status = $.net.http.OK;
        break;
    }
    
    
   
} catch (e) {
    $.response.setBody(e.toString());
    $.response.status = $.net.http.INTERNAL_SERVER_ERROR;
}

function del() {
    let
    iId = parseInt($.request.parameters.get("id")),
    iVersion = parseInt($.request.parameters.get("version"));
    
    let pstmt = conn.prepareStatement(
            "delete " +
            "from Z_BOBJ_REPO.T_TMP_CARD " +
            "where ID_CARD = ? " +
            "and VERSION = ? "
        );
        pstmt.setBigInt(1, iId);
        pstmt.setInteger(2, iVersion);
    
    
    
    $.response.status = $.net.http.OK;

    conn.commit();
    conn.close();

}
